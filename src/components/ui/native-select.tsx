import * as React from 'react';
import { cn } from 'cn';
import { ChevronDownIcon } from 'lucide-react';

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  Omit<React.ComponentPropsWithoutRef<'select'>, 'size'> & { size?: 'sm' | 'default' }
>(({ className, size = 'default', ...props }, ref) => {
  return (
    <div
      className="ui:group/native-select ui:relative ui:w-fit ui:has-[select:disabled]:opacity-50"
      data-slot="native-select-wrapper"
    >
      <select
        ref={ref}
        data-slot="native-select"
        data-size={size}
        className={cn(
          'ui:h-9 ui:w-full ui:min-w-0 ui:appearance-none ui:rounded-md ui:border ui:border-input ui:bg-transparent ui:px-3 ui:py-2 ui:pr-9 ui:text-sm ui:shadow-xs ui:transition-[color,box-shadow] ui:outline-none ui:selection:bg-primary ui:selection:text-primary-foreground ui:placeholder:text-muted-foreground ui:disabled:pointer-events-none ui:disabled:cursor-not-allowed ui:data-[size=sm]:h-8 ui:data-[size=sm]:py-1 ui:dark:bg-input/30 ui:dark:hover:bg-input/50',
          'ui:focus-visible:border-ring ui:focus-visible:ring-[3px] ui:focus-visible:ring-ring/50',
          'ui:aria-invalid:border-destructive ui:aria-invalid:ring-destructive/20 ui:dark:aria-invalid:ring-destructive/40',
          className,
        )}
        {...props}
      />
      <ChevronDownIcon
        className="ui:pointer-events-none ui:absolute ui:top-1/2 ui:right-3.5 ui:size-4 ui:-translate-y-1/2 ui:text-muted-foreground ui:opacity-50 ui:select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  );
});
NativeSelect.displayName = 'NativeSelect';

function NativeSelectOption({ className, ...props }: React.ComponentProps<'option'>) {
  return (
    <option
      data-slot="native-select-option"
      className={cn('ui:bg-[Canvas] ui:text-[CanvasText]', className)}
      {...props}
    />
  );
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<'optgroup'>) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn('ui:bg-[Canvas] ui:text-[CanvasText]', className)}
      {...props}
    />
  );
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption };
