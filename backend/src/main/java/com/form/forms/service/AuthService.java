package com.form.forms.service;

import com.form.forms.model.Role;
import com.form.forms.model.User;
import com.form.forms.repository.UserRepository;
import com.form.forms.security.JwtTokenProvider;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository, JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.tokenProvider = tokenProvider;
    }

    public String login(String username, String password) {
        username = username.trim();
        password = password.trim();

        Optional<User> userOpt = userRepository.findByUsername(username);

        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // TODO: Use PasswordEncoder in production
            if (password.equals(user.getPassword())) {
                Authentication authentication = new UsernamePasswordAuthenticationToken(username, password);
                SecurityContextHolder.getContext().setAuthentication(authentication);

                return tokenProvider.generateToken(authentication, user.getId(), user.getRole(),
                        user.getOrganizationId());
            } else {
                throw new RuntimeException("Password mismatch for user: " + username);
            }
        } else {
            throw new RuntimeException("User not found: " + username);
        }
    }

    // Role-based registration with hierarchy enforcement
    public User register(String name, String username, String password, Role role, String parentId) {
        username = username.trim();
        password = password.trim();

        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        User creator = null;
        if (parentId != null) {
            creator = userRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("Parent user not found"));
        }

        // Validate Hierarchy
        validateHierarchy(creator, role);

        User user = new User();
        user.setName(name);
        user.setUsername(username);
        user.setPassword(password); // Should encode
        user.setRole(role);
        user.setParentId(parentId);

        // Set Organization ID
        if (role == Role.SUPER_ADMIN) {
            user.setOrganizationId(null);
        } else if (role == Role.ADMIN) {
            // Admin is their own organization
            // Note: We might need to save first to get ID, or generate ID manually.
            // MongoDB usually generates ID on save.
        } else {
            // PM or NGO inherits Organization from creator
            if (creator != null) {
                if (creator.getRole() == Role.ADMIN) {
                    user.setOrganizationId(creator.getId());
                } else {
                    user.setOrganizationId(creator.getOrganizationId());
                }
            }
        }

        // Auto-Associate if Creator is PM
        if (creator != null && creator.getRole() == Role.PROJECT_MANAGER && role == Role.NGO) {
            user.getAssociatedPmIds().add(creator.getId());
        }

        User savedUser = userRepository.save(user);

        // Post-save fix for Admin's organizationId
        if (role == Role.ADMIN) {
            savedUser.setOrganizationId(savedUser.getId());
            return userRepository.save(savedUser);
        }

        return savedUser;
    }

    // Association Method
    public void addAssociation(String ngoId, String pmId) {
        User ngo = userRepository.findById(ngoId).orElseThrow(() -> new RuntimeException("NGO not found"));
        User pm = userRepository.findById(pmId).orElseThrow(() -> new RuntimeException("PM not found"));

        if (ngo.getRole() != Role.NGO)
            throw new RuntimeException("Target user is not an NGO");
        if (pm.getRole() != Role.PROJECT_MANAGER)
            throw new RuntimeException("Target user is not a PM");

        ngo.getAssociatedPmIds().add(pmId);
        userRepository.save(ngo);
    }

    public void removeAssociation(String ngoId, String pmId) {
        User ngo = userRepository.findById(ngoId).orElseThrow(() -> new RuntimeException("NGO not found"));
        ngo.getAssociatedPmIds().remove(pmId);
        userRepository.save(ngo);
    }

    // Initial Super Admin creation (bypass hierarchy check)
    public User createFirstSuperAdmin(String name, String username, String password) {
        if (userRepository.count() > 0) {
            if (userRepository.findByUsername(username).isPresent()) {
                throw new RuntimeException("Username exists");
            }
        }

        User user = new User();
        user.setName(name);
        user.setUsername(username);
        user.setPassword(password);
        user.setRole(Role.SUPER_ADMIN);
        return userRepository.save(user);
    }

    private void validateHierarchy(User creator, Role newRole) {
        if (newRole == Role.SUPER_ADMIN) {
            throw new RuntimeException("Cannot create Super Admin manually via API");
        }

        if (creator == null) {
            // Allow ADMIN to be created without parent (New Organization self-registration)
            if (newRole == Role.ADMIN)
                return;
            throw new RuntimeException("Creator required");
        }

        Role creatorRole = creator.getRole();

        // Super Admin -> creates Admin
        if (creatorRole == Role.SUPER_ADMIN && newRole == Role.ADMIN)
            return;

        // Super Admin -> creates PM/NGO (Bypassing hierarchy for flexibility)
        if (creatorRole == Role.SUPER_ADMIN && (newRole == Role.PROJECT_MANAGER || newRole == Role.NGO))
            return;

        // Admin -> creates PM, NGO
        if (creatorRole == Role.ADMIN && (newRole == Role.PROJECT_MANAGER || newRole == Role.NGO))
            return;

        // PM -> creates NGO
        if (creatorRole == Role.PROJECT_MANAGER && newRole == Role.NGO)
            return;

        throw new RuntimeException("Unauthorized: " + creatorRole + " cannot create " + newRole);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public List<User> getAccessibleUsers() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null)
            return List.of();

        String username = auth.getName();
        User currentUser = userRepository.findByUsername(username).orElse(null);
        if (currentUser == null)
            return List.of();

        if (currentUser.getRole() == Role.SUPER_ADMIN) {
            return userRepository.findAll();
        }

        String orgId = currentUser.getOrganizationId();
        List<User> orgUsers = userRepository.findByOrganizationId(orgId);

        if (currentUser.getRole() == Role.PROJECT_MANAGER) {
            // PM sees:
            // 1. Other PMs? (Maybe not)
            // 2. ONLY NGOs associated with them
            // 3. (Optional) Themselves
            return orgUsers.stream().filter(u -> u.getId().equals(currentUser.getId()) || // Self
                    (u.getRole() == Role.NGO && u.getAssociatedPmIds() != null
                            && u.getAssociatedPmIds().contains(currentUser.getId())))
                    .collect(Collectors.toList());
        }

        // Admin sees all in Org
        return orgUsers;
    }

    public User getUserById(String id) {
        return userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
    }
}
