import { useState } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface AlertOptions {
  title: string;
  message: string;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

export const useModal = () => {
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    onConfirm: () => void;
    loading: boolean;
  }>({
    isOpen: false,
    options: { title: '', message: '' },
    onConfirm: () => {},
    loading: false
  });

  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    options: AlertOptions;
  }>({
    isOpen: false,
    options: { title: '', message: '' }
  });

  const showConfirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        options,
        onConfirm: () => {
          resolve(true);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        },
        loading: false
      });
    });
  };

  const showAlert = (options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertModal({
        isOpen: true,
        options
      });
      // Auto-resolve when modal is closed
      setTimeout(() => resolve(), 100);
    });
  };

  const closeConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const closeAlert = () => {
    setAlertModal(prev => ({ ...prev, isOpen: false }));
  };

  const setConfirmLoading = (loading: boolean) => {
    setConfirmModal(prev => ({ ...prev, loading }));
  };

  return {
    confirmModal,
    alertModal,
    showConfirm,
    showAlert,
    closeConfirm,
    closeAlert,
    setConfirmLoading
  };
};