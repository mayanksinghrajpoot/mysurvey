package com.form.forms;

import com.form.forms.model.Role;
import com.form.forms.model.User;
import com.form.forms.repository.UserRepository;
import com.form.forms.security.JwtTokenProvider;
import com.form.forms.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RbacServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private User superAdmin;
    private User admin;
    private User pm;

    @BeforeEach
    void setUp() {
        superAdmin = new User();
        superAdmin.setId("sa-1");
        superAdmin.setRole(Role.SUPER_ADMIN);

        admin = new User();
        admin.setId("admin-1");
        admin.setOrganizationId("admin-1");
        admin.setRole(Role.ADMIN);

        pm = new User();
        pm.setId("pm-1");
        pm.setOrganizationId("admin-1");
        pm.setRole(Role.PROJECT_MANAGER);
    }

    @Test
    void testPublicAdminRegistration_Success() {
        // Mock save to return the user
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = (User) i.getArguments()[0];
            u.setId("new-admin-id");
            return u;
        });
        when(passwordEncoder.encode(any(String.class))).thenReturn("encodedPass");

        User created = authService.register("New Org", "org_admin", "pass", Role.ADMIN, null);

        assertNotNull(created);
        assertEquals(Role.ADMIN, created.getRole());
        assertEquals("new-admin-id", created.getOrganizationId()); // Should be set to own ID
    }

    @Test
    void testPublicPMRegistration_Failure() {
        // PM cannot register without parent
        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> authService.register("New PM", "pm_user", "pass", Role.PROJECT_MANAGER, null));
        assertTrue(exception.getMessage().contains("Creator required"));
    }

    @Test
    void testAdminCreatesPM_Success() {
        when(userRepository.findById("admin-1")).thenReturn(Optional.of(admin));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArguments()[0]);
        when(passwordEncoder.encode(any(String.class))).thenReturn("encodedPass");

        User created = authService.register("New PM", "newpm", "pass", Role.PROJECT_MANAGER, "admin-1");

        assertNotNull(created);
        assertEquals(Role.PROJECT_MANAGER, created.getRole());
        assertEquals("admin-1", created.getOrganizationId());
    }
}
