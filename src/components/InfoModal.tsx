import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-4xl z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-gray-100">
              About Nano Banana + Veo
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                Maintained by{' '}
                <a
                  href="https://github.com/wishescsnow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 transition-colors font-semibold"
                >
                  wishescsnow
                  <ExternalLink className="h-3 w-3 inline ml-1" />
                </a>
              </p>

              <div className="p-4 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/30">
                <h4 className="text-sm font-semibold text-yellow-300 mb-3">
                  Features
                </h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• AI Image Generation with Gemini 3.0 Pro</li>
                  <li>• AI Video Generation with Veo 3.x</li>
                  <li>• Conversational Image Editing</li>
                  <li>• Region-aware Mask Painting</li>
                  <li>• Batch API Queue (50% Cost Savings)</li>
                  <li>• Video Interpolation & Extension</li>
                </ul>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};