import React, { useEffect, useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../supabase/client'
import { Download, Database, Play, Save, History, Settings, RefreshCw, CheckCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { formatDate } from '../../utils/helpers'

export default function BackupRetentionManagement() {
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Retention states
  const [retentionYears, setRetentionYears] = useState('2')
  const [retentionEnabled, setRetentionEnabled] = useState(true)
  
  // Logs state
  const [auditLogs, setAuditLogs] = useState([])

  const fetchSettingsAndLogs = async () => {
    setLoading(true)
    try {
      // 1. Fetch system settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('*')
        .in('key', ['booking_retention_years', 'booking_retention_enabled'])

      if (settingsData) {
        const yearsSetting = settingsData.find(s => s.key === 'booking_retention_years')
        const enabledSetting = settingsData.find(s => s.key === 'booking_retention_enabled')
        
        if (yearsSetting) setRetentionYears(yearsSetting.value)
        if (enabledSetting) setRetentionEnabled(enabledSetting.value === 'true')
      }

      // 2. Fetch recent archive/backup audit logs
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('*')
        .in('action', ['RUN_ARCHIVER', 'UPDATE_ROLE'])
        .order('created_at', { ascending: false })
        .limit(10)

      setAuditLogs(logs || [])
    } catch (err) {
      console.error(err)
      toast.error('Failed to load system settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettingsAndLogs()
  }, [])

  // JSON to CSV converter helper
  const convertToCSV = (objArray) => {
    if (!objArray || objArray.length === 0) return ''
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray
    const headers = Object.keys(array[0])
    
    let str = headers.join(',') + '\r\n'
    
    for (let i = 0; i < array.length; i++) {
      let line = ''
      for (let index in headers) {
        if (line !== '') line += ','
        
        let val = array[i][headers[index]]
        if (val === null || val === undefined) {
          val = ''
        } else if (typeof val === 'object') {
          val = JSON.stringify(val).replace(/"/g, '""')
        } else {
          val = val.toString().replace(/"/g, '""')
        }
        line += `"${val}"`
      }
      str += line + '\r\n'
    }
    return str
  }

  // Trigger file download helper
  const triggerDownload = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Backup exporter handler
  const handleExport = async (tableName, format = 'csv') => {
    try {
      toast.loading(`Fetching ${tableName} data...`, { id: 'export' })
      const { data, error } = await supabase
        .from(tableName)
        .select('*')

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error(`No records found in table ${tableName}`, { id: 'export' })
        return
      }

      const filename = `cleanconnect_backup_${tableName}_${new Date().toISOString().split('T')[0]}.${format}`
      
      if (format === 'json') {
        const jsonContent = JSON.stringify(data, null, 2)
        triggerDownload(jsonContent, filename, 'application/json')
      } else {
        const csvContent = convertToCSV(data)
        triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;')
      }
      toast.success(`${tableName} exported successfully!`, { id: 'export' })
    } catch (err) {
      toast.error(`Failed to export ${tableName}`, { id: 'export' })
    }
  }

  // Save retention rules
  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const { error: err1 } = await supabase
        .from('system_settings')
        .update({ value: retentionYears })
        .eq('key', 'booking_retention_years')

      const { error: err2 } = await supabase
        .from('system_settings')
        .update({ value: retentionEnabled.toString() })
        .eq('key', 'booking_retention_enabled')

      if (err1 || err2) throw err1 || err2

      // Log setting update
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('activity_logs')
          .insert([{
            user_id: user.id,
            action: 'UPDATE_RETENTION_RULE',
            entity_type: 'settings',
            metadata: {
              retention_years: retentionYears,
              retention_enabled: retentionEnabled
            }
          }])
      }

      toast.success('Retention configurations saved!')
    } catch (err) {
      toast.error('Failed to save rules')
    } finally {
      setSavingSettings(false)
    }
  }

  // Archival execution
  const handleRunArchiver = async () => {
    const confirm = window.confirm(`Are you sure you want to run the archiver now? This will move bookings older than ${retentionYears} years to archive storage.`)
    if (!confirm) return

    setArchiving(true)
    try {
      const years = parseFloat(retentionYears)
      const cutoff = new Date()
      // Subtract years (e.g. 2 years = 730 days)
      cutoff.setDate(cutoff.getDate() - (years * 365))
      const cutoffString = cutoff.toISOString().split('T')[0]

      // 1. Fetch old bookings
      const { data: bookingsToArchive, error: fetchErr } = await supabase
        .from('bookings')
        .select('*')
        .lt('service_date', cutoffString)

      if (fetchErr) throw fetchErr

      if (!bookingsToArchive || bookingsToArchive.length === 0) {
        toast.info(`No bookings found older than ${retentionYears} years (${cutoffString}).`)
        setArchiving(false)
        return
      }

      // 2. Insert into archived_bookings
      const archivePayload = bookingsToArchive.map(b => ({
        booking_id: b.id,
        booking_data: b
      }))

      const { error: insertErr } = await supabase
        .from('archived_bookings')
        .insert(archivePayload)

      if (insertErr) throw insertErr

      // 3. Delete from production bookings
      const ids = bookingsToArchive.map(b => b.id)
      const { error: deleteErr } = await supabase
        .from('bookings')
        .delete()
        .in('id', ids)

      if (deleteErr) throw deleteErr

      // 4. Log the action
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('activity_logs')
          .insert([{
            user_id: user.id,
            action: 'RUN_ARCHIVER',
            entity_type: 'booking',
            metadata: {
              archived_count: bookingsToArchive.length,
              cutoff_date: cutoffString,
              retention_years: retentionYears
            }
          }])
      }

      toast.success(`Archiving successful! Moved ${bookingsToArchive.length} bookings to archive storage.`)
      fetchSettingsAndLogs()
    } catch (err) {
      console.error(err)
      toast.error('Archival process failed')
    } finally {
      setArchiving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Backup & Retention Control</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Export platform data tables, configure automatic archiving rules, and audit security events
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : (
          <div className="grid-3" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'start', gap: '1.5rem' }}>
            
            {/* Left Column: Exporters & Archivist */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Backups Panel */}
              <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <Download size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>One-Click Data Exporters</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { label: 'User Directory Database', desc: 'Active cleaners, homeowners and system operators.', table: 'users' },
                    { label: 'Bookings & Schedules Ledger', desc: 'All platform service bookings and job records.', table: 'bookings' },
                    { label: 'Payment Logs & Billing', desc: 'Payment transactions, receipts, and offline tokens.', table: 'payments' },
                    { label: 'Security & Activity Logs', desc: 'Audit records, role promotions, and configuration modifications.', table: 'activity_logs' }
                  ].map((exp, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                      <div>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 700 }}>{exp.label}</h4>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{exp.desc}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => handleExport(exp.table, 'csv')} 
                          className="btn btn-secondary btn-sm"
                          style={{ gap: '4px', padding: '6px 10px', fontSize: '11px' }}
                        >
                          CSV
                        </button>
                        <button 
                          onClick={() => handleExport(exp.table, 'json')} 
                          className="btn btn-secondary btn-sm"
                          style={{ gap: '4px', padding: '6px 10px', fontSize: '11px' }}
                        >
                          JSON
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Archiving Config Panel */}
              <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                  <Database size={18} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Database Archiving & Retention</h3>
                </div>

                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  Moving old booking history records out of the primary production table to archived storage optimizes system performance, reduces query delays, and keeps tables clean.
                </p>

                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>Enable Data Archiving</span>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Automatically log old bookings to archived storage</p>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={retentionEnabled} 
                      onChange={e => setRetentionEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Retention Window (Cutoff Window)</label>
                    <select 
                      className="form-input"
                      value={retentionYears}
                      onChange={e => setRetentionYears(e.target.value)}
                    >
                      <option value="0.5">6 Months</option>
                      <option value="1">1 Year</option>
                      <option value="2">2 Years (Recommended)</option>
                      <option value="3">3 Years</option>
                      <option value="5">5 Years</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-end', gap: '4px' }} disabled={savingSettings}>
                    <Save size={14} /> {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </form>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 700 }}>Manual Archiver Trigger</h4>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Forces immediate archival sweep using current settings.</p>
                  </div>
                  <button 
                    onClick={handleRunArchiver} 
                    className="btn btn-primary" 
                    style={{ gap: '6px', fontSize: '12px', padding: '8px 16px' }}
                    disabled={archiving}
                  >
                    <Play size={14} /> {archiving ? 'Archiving...' : 'Run Archiver Now'}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column: Security Audits */}
            <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem' }}>
                <History size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Audit Logs</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto' }}>
                {auditLogs.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '2rem' }}>
                    No audit logs available.
                  </p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '6px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className={`badge ${log.action === 'UPDATE_ROLE' ? 'badge-pending' : 'badge-verified'}`} style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                          {log.action}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {formatDate(log.created_at)}
                        </span>
                      </div>
                      
                      {log.action === 'UPDATE_ROLE' ? (
                        <div>
                          <p style={{ fontWeight: 600 }}>User: {log.metadata?.user_name}</p>
                          <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                            Role: <span style={{ textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 700 }}>{log.metadata?.old_role}</span> &rarr; <span style={{ textTransform: 'uppercase', color: 'var(--success)', fontWeight: 700 }}>{log.metadata?.new_role}</span>
                          </p>
                          {log.metadata?.reason && (
                            <p style={{ fontStyle: 'italic', background: 'rgba(0,0,0,0.1)', padding: '4px 6px', borderRadius: '4px', marginTop: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Reason: "{log.metadata.reason}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontWeight: 600 }}>Archived Cutoff: {log.metadata?.cutoff_date}</p>
                          <p style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                            Moved <span style={{ color: 'var(--success)', fontWeight: 700 }}>{log.metadata?.archived_count}</span> bookings (Older than {log.metadata?.retention_years} years).
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  )
}
