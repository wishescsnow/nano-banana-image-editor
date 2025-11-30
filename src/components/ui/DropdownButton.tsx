import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface DropdownOption {
    id: string;
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
}

interface DropdownButtonProps {
    children: React.ReactNode;
    options: DropdownOption[];
    onClick: () => void;
    disabled?: boolean;
    className?: string;
}

export const DropdownButton: React.FC<DropdownButtonProps> = ({
    children,
    options,
    onClick,
    disabled,
    className
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={dropdownRef} className="relative w-full">
            <div className="flex w-full">
                {/* Main button */}
                <button
                    onClick={onClick}
                    disabled={disabled}
                    className={cn(
                        'flex-1 h-14 px-4 rounded-l-lg font-medium transition-all duration-200',
                        'bg-yellow-400 text-gray-900 hover:bg-yellow-300',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-400',
                        'flex items-center justify-center',
                        className
                    )}
                >
                    {children}
                </button>

                {/* Dropdown trigger */}
                <button
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        'h-14 px-2 rounded-r-lg border-l border-yellow-500/30 transition-all duration-200',
                        'bg-yellow-400 text-gray-900 hover:bg-yellow-300',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-400',
                        'flex items-center justify-center'
                    )}
                >
                    <ChevronDown className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )} />
                </button>
            </div>

            {/* Dropdown menu */}
            {isOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => {
                                option.onClick();
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-gray-200 hover:bg-gray-700 transition-colors flex items-center space-x-2"
                        >
                            {option.icon && <span className="text-gray-400">{option.icon}</span>}
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

