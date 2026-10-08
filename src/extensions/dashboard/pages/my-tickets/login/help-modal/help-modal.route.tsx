import { useState, useEffect } from 'react';
import HelpModalWrapper from './help-modal.wrapper';
import { getAppInstance } from './help-modal';
import type { HelpModalProps, HelpModalDetails } from './help-modal.types';
import { ShowToast } from '@jrapps/my_tickets_dashboard_ui';

const HelpModal = ({ isOpen, onClose }: HelpModalProps) => {
    const [details, setDetails] = useState<HelpModalDetails>({});

    useEffect(() => {
        const loadInstance = async () => {
            try {
                const instance = await getAppInstance();
                setDetails(instance);
            } catch (error: any) {
                console.error(error.message)
                ShowToast({ message: error.message, type: 'error' });
            }
        };

        if (isOpen) {
            loadInstance();
        }
    }, [isOpen]);

    return <HelpModalWrapper isOpen={isOpen} onClose={onClose} details={details} />
}

export default HelpModal;