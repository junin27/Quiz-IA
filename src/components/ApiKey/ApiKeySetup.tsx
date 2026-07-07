import React from 'react';
import type { User } from '../../types/user.types';
import { ApiKeyManager } from './ApiKeyManager';

interface ApiKeySetupProps {
  currentUser: User;
  currentUserPassword: string;
  onSetupSuccess: (updatedUser: User) => void;
  showToastMessage: (msg: string, type: 'success' | 'error') => void;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({
  currentUser,
  currentUserPassword,
  onSetupSuccess,
  showToastMessage,
}) => {
  return (
    <div className="w-full max-w-md mx-auto my-10 relative">
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <ApiKeyManager
        currentUser={currentUser}
        currentUserPassword={currentUserPassword}
        onUpdateSuccess={onSetupSuccess}
        showToastMessage={showToastMessage}
        isSetupMode={true}
      />
    </div>
  );
};

export default ApiKeySetup;
