"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ReportPopupProps {
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

const reportReasons = [
  "\uC0C1\uD488\uACFC \uBB34\uAD00\uD55C \uB0B4\uC6A9",
  "\uAC1C\uC778 \uC815\uBCF4 \uB178\uCD9C",
  "\uC695\uC124/\uC778\uC2E0 \uACF5\uACA9",
  "\uAC19\uC740 \uB0B4\uC6A9 \uB3C4\uBC30",
  "\uC798\uBABB\uB41C \uC815\uBCF4",
  "\uC74C\uB780/\uC120\uC815\uC131",
  "\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC0C1\uC5C5\uC131 \uAC8C\uC2DC\uBB3C",
  "\uC99D\uC624\uC2EC \uD45C\uD604 \uB610\uB294 \uB178\uACE8\uC801\uC778\uD3ED\uB825",
];

export default function ReportPopup({ onClose, onSubmit }: ReportPopupProps) {
  const [selectedReason, setSelectedReason] = useState<string>(reportReasons[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll while open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!mounted) return null;

  const popup = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: 'var(--color-surface, #fff)', borderRadius: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div style={{ padding: '1.25rem 1.5rem 1rem', borderBottom: '1px solid var(--color-outline-variant, #e0e0e0)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-on-surface, #1a1a1a)', margin: 0 }}>
            {"\uC5B4\uB5A4 \uC810\uC774 \uBD88\uD3B8\uD558\uC168\uB098\uC694?"}
          </h2>
        </div>

        {/* Options */}
        <div style={{ padding: '0.75rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto', maxHeight: '60vh' }}>
          {reportReasons.map((reason) => (
            <label
              key={reason}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', cursor: 'pointer' }}
              onClick={() => setSelectedReason(reason)}
            >
              {/* Custom radio */}
              <div style={{ position: 'relative', width: '20px', height: '20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${selectedReason === reason ? 'var(--color-primary, #6750A4)' : 'var(--color-outline, #79747E)'}`,
                  flexShrink: 0,
                }} />
                {selectedReason === reason && (
                  <div style={{
                    position: 'absolute',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-primary, #6750A4)',
                  }} />
                )}
              </div>
              <span style={{
                fontSize: '0.9rem',
                color: selectedReason === reason ? 'var(--color-on-surface, #1a1a1a)' : 'var(--color-on-surface-variant, #49454F)',
                fontWeight: selectedReason === reason ? 500 : 400,
              }}>
                {reason}
              </span>
            </label>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--color-outline-variant, #e0e0e0)' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '1rem', fontSize: '0.95rem', fontWeight: 500, color: 'var(--color-on-surface-variant, #49454F)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {"\uCDE8\uC18C"}
          </button>
          <div style={{ width: '1px', backgroundColor: 'var(--color-outline-variant, #e0e0e0)' }} />
          <button
            onClick={() => onSubmit(selectedReason)}
            style={{ flex: 1, padding: '1rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary, #6750A4)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {"\uC2E0\uACE0"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popup, document.body);
}
