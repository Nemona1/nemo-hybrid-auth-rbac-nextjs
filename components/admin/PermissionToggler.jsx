'use client';

import { useState } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/TooltipWrapper';
import { Card } from '@/components/ui/Card';

export default function PermissionToggler({ user, permissions, onGrantPermission }) {
  const [expiryDate, setExpiryDate] = useState('');
  
  const getUserPermissionStatus = (permissionId) => {
    const userPerm = user.directPermissions?.find(dp => dp.permission.id === permissionId);
    if (!userPerm) return null;
    return userPerm.isGranted;
  };
  
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {});

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Manage Permissions for {user.firstName} {user.lastName}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Current Role: {user.role?.name || 'No role assigned'}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          💡 Direct permissions override role permissions. Red = Denied, Green = Granted.
        </p>
      </div>
      
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 capitalize border-b pb-2">
              {category} Permissions
            </h3>
            <div className="space-y-3">
              {perms.map((permission) => {
                const status = getUserPermissionStatus(permission.id);
                return (
                  <div key={permission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{permission.name}</p>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {status !== null && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {status ? 'Granted' : 'Denied'}
                        </span>
                      )}
                      
                      <TooltipWrapper content={status === true ? 'Revoke Permission' : status === false ? 'Remove Deny' : 'Grant Permission'}>
                        <button
                          onClick={() => {
                            const newStatus = status === true ? false : status === false ? null : true;
                            onGrantPermission(
                              user.id, 
                              permission.id, 
                              newStatus === true ? true : false,
                              expiryDate || null
                            );
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            status === true ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                            status === false ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                            'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          }`}
                        >
                          {status === true ? <Check className="h-4 w-4" /> :
                           status === false ? <X className="h-4 w-4" /> :
                           <Clock className="h-4 w-4" />}
                        </button>
                      </TooltipWrapper>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Temporary Permission Expiry (Optional)
        </label>
        <input
          type="datetime-local"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className="input-field"
        />
      </div>
    </Card>
  );
}