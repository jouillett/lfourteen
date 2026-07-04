import React from 'react';

interface InquiryPopupProps {
  inquiry: any;
  onClose: () => void;
}

export default function InquiryPopup({ inquiry, onClose }: InquiryPopupProps) {
  // Prevent click from propagating to background
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-surface-container-lowest w-full max-w-[800px] rounded-[16px] shadow-lg relative border border-outline-variant overflow-hidden"
        onClick={handleContentClick}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface hover:text-primary transition-colors z-10"
          aria-label="Close"
        >
          <span className="material-symbols-outlined font-bold text-[24px]">close</span>
        </button>

        <div className="p-8 pt-10">
          {/* Header row */}
          <div className="flex items-center justify-between border-b border-outline-variant pb-4 mb-6">
            <div className="flex items-center">
              <span className={`px-4 py-1.5 text-[13px] font-medium rounded-md ${
                inquiry.is_answer 
                  ? 'bg-surface-variant text-on-surface-variant' 
                  : 'bg-surface-container text-on-surface-variant'
              }`}>
                {inquiry.is_answer ? '답변완료' : '답변대기'}
              </span>
            </div>
            
            <div className="flex items-center space-x-6 text-[14px] text-on-surface-variant">
              <div className="flex items-center space-x-2">
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span>{inquiry.customer_name || '조민균'}</span>
              </div>
              <div>
                {inquiry.written_at ? new Date(inquiry.written_at).toISOString().split('T')[0].replace(/-/g, '.') : ''}
              </div>
            </div>
          </div>

          {/* Question content */}
          <div className="text-[16px] text-on-surface leading-relaxed mb-8 whitespace-pre-wrap">
            {inquiry.content}
          </div>

          {/* Answer block */}
          {inquiry.is_answer && inquiry.answer_content && (
            <div className="bg-surface rounded-xl border border-outline-variant p-6">
              <div className="flex items-center space-x-2 mb-4">
                <span className="material-symbols-outlined text-[24px] text-on-surface">support_agent</span>
                <span className="font-bold text-[16px] text-on-surface">기쁜하루</span>
              </div>
              <div className="text-[15px] text-on-surface-variant leading-relaxed whitespace-pre-wrap">
                {inquiry.answer_content}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
