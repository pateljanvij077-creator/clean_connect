import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function BottomSheet({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(6, 9, 19, 0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 999
            }}
          />
          
          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '85vh',
              background: 'var(--bg-secondary)',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
              borderTop: '1px solid var(--border-glass)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
              padding: '1.5rem',
              overflowY: 'auto',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {/* Grab/Drag Handle indicator for native look */}
            <div style={{
              width: '40px',
              height: '4px',
              background: 'var(--border-subtle)',
              borderRadius: '2px',
              margin: '0 auto',
              cursor: 'pointer'
            }} />
            
            {/* Title & Close Button Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>{title}</h3>
              <button 
                onClick={onClose} 
                style={{ 
                  border: 'none', 
                  background: 'var(--bg-tertiary)', 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer', 
                  padding: '6px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background var(--transition-fast)'
                }}
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Content area */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
