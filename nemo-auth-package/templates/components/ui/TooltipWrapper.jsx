'use client';

import * as Tooltip from '@radix-ui/react-tooltip';

export function TooltipWrapper({ children, content, side = 'top' }) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={0}>
        <Tooltip.Trigger asChild>
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side={side}
            className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-md shadow-lg z-50"
            sideOffset={5}
          >
            {content}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}