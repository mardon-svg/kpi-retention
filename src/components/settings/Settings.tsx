import React from 'react';
import UserManagement from '@/components/settings/UserManagement';

/**
 * Settings page groups various configuration sections.
 */
const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <UserManagement />
    </div>
  );
};

export default Settings;
