import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { Plus, Trash2, Shield, Key, Check } from 'lucide-react'
import { toast } from 'react-hot-toast'

export default function RolesPermissionsManagement() {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [rolePermissions, setRolePermissions] = useState([]) // array of {role_id, permission_id}
  const [selectedRole, setSelectedRole] = useState(null)
  const [loading, setLoading] = useState(true)

  // Forms
  const [newRoleName, setNewRoleName] = useState('')
  const [newPermissionName, setNewPermissionName] = useState('')
  const [newPermissionDesc, setNewPermissionDesc] = useState('')
  const [savingRole, setSavingRole] = useState(false)
  const [savingPermission, setSavingPermission] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: rolesData } = await supabase.from('roles').select('*')
      const { data: permissionsData } = await supabase.from('permissions').select('*').order('name')
      const { data: rpData } = await supabase.from('role_permissions').select('*')

      setRoles(rolesData || [])
      setPermissions(permissionsData || [])
      setRolePermissions(rpData || [])

      if (rolesData && rolesData.length > 0 && !selectedRole) {
        setSelectedRole(rolesData[0])
      } else if (rolesData && selectedRole) {
        // Keep selected role up to date
        const updatedSelected = rolesData.find(r => r.id === selectedRole.id)
        if (updatedSelected) setSelectedRole(updatedSelected)
      }
    } catch (err) {
      console.error('Error loading RBAC data:', err)
      toast.error('Failed to load access control settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddRole = async (e) => {
    e.preventDefault()
    if (!newRoleName.trim()) return
    setSavingRole(true)

    try {
      const roleName = newRoleName.trim().toLowerCase()
      const { data, error } = await supabase
        .from('roles')
        .insert([{ name: roleName }])
        .select()
        .single()

      if (error) throw error

      toast.success('Role added successfully!')
      setNewRoleName('')
      await loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to add role')
    } finally {
      setSavingRole(false)
    }
  }

  const handleDeleteRole = async (roleId, roleName) => {
    if (['admin', 'worker', 'homeowner'].includes(roleName)) {
      toast.error('Cannot delete default system roles')
      return
    }

    const confirm = window.confirm(`Are you sure you want to delete the role "${roleName.toUpperCase()}"?`)
    if (!confirm) return

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error

      toast.success('Role deleted')
      if (selectedRole && selectedRole.id === roleId) {
        setSelectedRole(null)
      }
      await loadData()
    } catch (err) {
      toast.error('Failed to delete role')
    }
  }

  const handleAddPermission = async (e) => {
    e.preventDefault()
    if (!newPermissionName.trim()) return
    setSavingPermission(true)

    try {
      const name = newPermissionName.trim().toLowerCase().replace(/\s+/g, '_')
      const { error } = await supabase
        .from('permissions')
        .insert([{ name, description: newPermissionDesc.trim() }])

      if (error) throw error

      toast.success('Permission created successfully!')
      setNewPermissionName('')
      setNewPermissionDesc('')
      await loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to create permission')
    } finally {
      setSavingPermission(false)
    }
  }

  const handleDeletePermission = async (permId, permName) => {
    const confirm = window.confirm(`Delete permission "${permName}"? This will revoke it from all roles.`)
    if (!confirm) return

    try {
      const { error } = await supabase
        .from('permissions')
        .delete()
        .eq('id', permId)

      if (error) throw error

      toast.success('Permission deleted')
      await loadData()
    } catch (err) {
      toast.error('Failed to delete permission')
    }
  }

  const handleTogglePermission = async (permissionId) => {
    if (!selectedRole) return

    const exists = rolePermissions.some(
      rp => rp.role_id === selectedRole.id && rp.permission_id === permissionId
    )

    try {
      if (exists) {
        // Remove mapping
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .match({ role_id: selectedRole.id, permission_id: permissionId })

        if (error) throw error
        setRolePermissions(rolePermissions.filter(
          rp => !(rp.role_id === selectedRole.id && rp.permission_id === permissionId)
        ))
        toast.success('Permission revoked')
      } else {
        // Add mapping
        const { error } = await supabase
          .from('role_permissions')
          .insert([{ role_id: selectedRole.id, permission_id: permissionId }])

        if (error) throw error
        setRolePermissions([...rolePermissions, { role_id: selectedRole.id, permission_id: permissionId }])
        toast.success('Permission granted')
      }
    } catch (err) {
      toast.error('Failed to update privileges')
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Roles & Access Control</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Configure custom user groups, add permissions, and map access privileges
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid-3" style={{ gridTemplateColumns: '1fr 1.5fr 1fr', alignItems: 'start', gap: '1.5rem' }}>
            
            {/* Roles Listing Card */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <Shield size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Platform Roles</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {roles.map(r => (
                  <div 
                    key={r.id} 
                    onClick={() => setSelectedRole(r)}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedRole?.id === r.id ? 'var(--primary-light)' : 'rgba(255,255,255,0.01)',
                      border: selectedRole?.id === r.id ? '1px solid var(--primary)' : '1px solid transparent',
                      color: selectedRole?.id === r.id ? 'var(--primary)' : 'var(--text-primary)',
                      fontWeight: selectedRole?.id === r.id ? 700 : 500,
                      transition: 'all 0.2s'
                    }}
                  >
                    <span style={{ textTransform: 'uppercase', fontSize: '12px' }}>{r.name}</span>
                    {!['admin', 'worker', 'homeowner'].includes(r.name) && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteRole(r.id, r.name)
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <form onSubmit={handleAddRole} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Add Custom Role</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. support" 
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 12px' }} disabled={savingRole}>
                    <Plus size={16} />
                  </button>
                </div>
              </form>
            </div>

            {/* Privileges Matrix Card */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                    Privileges for: <span style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{selectedRole?.name || 'Select Role'}</span>
                  </h3>
                </div>
              </div>

              {selectedRole ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                  {permissions.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '1.5rem' }}>
                      No permissions configured in the system.
                    </p>
                  ) : (
                    permissions.map(p => {
                      const isGranted = rolePermissions.some(
                        rp => rp.role_id === selectedRole.id && rp.permission_id === p.id
                      )
                      return (
                        <div 
                          key={p.id}
                          onClick={() => handleTogglePermission(p.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            background: isGranted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1px solid ${isGranted ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-subtle)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `2px solid ${isGranted ? 'var(--success)' : 'var(--text-muted)'}`,
                            background: isGranted ? 'var(--success)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                          }}>
                            {isGranted && <Check size={12} strokeWidth={4} />}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', color: isGranted ? 'var(--success)' : 'var(--text-primary)' }}>
                              {p.name.replace(/_/g, ' ')}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {p.description || 'No description provided'}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '2rem' }}>
                  Please select a role to configure permissions.
                </p>
              )}
            </div>

            {/* Add Permissions Form Card */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <Plus size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>New Privilege</h3>
              </div>

              <form onSubmit={handleAddPermission} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Permission Key Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. view_analytics" 
                    value={newPermissionName}
                    onChange={e => setNewPermissionName(e.target.value)}
                    required 
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px', display: 'block' }}>
                    Lowercase with underscores only
                  </small>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Description</label>
                  <textarea 
                    className="form-input" 
                    placeholder="Describe what action this grants..." 
                    value={newPermissionDesc}
                    onChange={e => setNewPermissionDesc(e.target.value)}
                    style={{ minHeight: '80px', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ gap: '6px' }} disabled={savingPermission}>
                  <Plus size={16} /> Create Privilege
                </button>
              </form>

              {/* Permissions Delete List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <label className="form-label" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Delete Privilege</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {permissions.map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px' }}>
                      <span style={{ textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>{p.name}</span>
                      <button 
                        type="button" 
                        onClick={() => handleDeletePermission(p.id, p.name)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  )
}
