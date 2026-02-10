import React, { useEffect, useState } from 'react';
import { FormBuilder } from './FormBuilder/FormBuilder';
import api from '../services/api';
import { toast } from 'react-toastify';

const TemplateBuilder = ({ type, onClose }) => {
    const [initialData, setInitialData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSchema = async () => {
            try {
                setLoading(false);
                try {
                    // Attempt to fetch existing schema
                    // We assume the user is logged in and the backend can identify the tenant/user
                    // Or we just fetch by type if that's how it works.
                    // Ideally we need tenantId. For now, let's try to get it from auth/me or similar if exists
                    // or just rely on the backend filtering by current user's tenant.
                    // The original code tried to fetch with tenantId.

                    const userRes = await api.get('/auth/me');
                    const tenantId = userRes.data.id;
                    const res = await api.get(`/schemas?tenantId=${tenantId}&type=${type}`);

                    if (res.data && res.data.schemaJson) {
                        const parsed = JSON.parse(res.data.schemaJson);
                        setInitialData(parsed);
                    }
                } catch (e) {
                    console.log("No existing schema or error fetching", e);
                }
            } catch (err) {
                console.error(err);
            }
        };
        loadSchema();
    }, [type]);

    const handleSave = async (formData) => {
        try {
            const payload = {
                type: type,
                schemaJson: JSON.stringify(formData)
            };
            await api.post('/schemas', payload);
            toast.success(`${type} Template Saved Successfully!`);
            if (onClose) onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save template.");
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="flex-1 relative">
                <FormBuilder
                    initialData={initialData}
                    onSave={handleSave}
                    onClose={onClose}
                />
            </div>
        </div>
    );
};

export default TemplateBuilder;
