import React from 'react';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export default function PhoneInput({ value, onChange, ...props }: PhoneInputProps) {
  const formatPhoneNumber = (phoneNumber: string) => {
    if (!phoneNumber) return '';

    // 숫자만 추출
    const numbers = phoneNumber.replace(/\D/g, '');

    // 서울 지역번호 (02)
    if (numbers.startsWith('02')) {
      if (numbers.length <= 2) {
        return numbers;
      } else if (numbers.length <= 5) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
      } else if (numbers.length <= 9) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
      } else {
        return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
      }
    }
    // 8자리 대표번호 (1588, 1577 등)
    else if (numbers.length === 8) {
      return `${numbers.slice(0, 4)}-${numbers.slice(4)}`;
    }
    // 나머지 지역번호 (031, 010 등)
    else if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(formatPhoneNumber(e.target.value));
  };

  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      {...props}
    />
  );
}
