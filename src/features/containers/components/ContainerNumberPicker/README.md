# ContainerNumberPicker Component

A reusable React component for entering and validating ISO 6346 shipping container numbers with automatic resolution and creation capabilities.

## Features

- ✅ **ISO 6346 Validation**: Real-time validation of container number format and check digit
- 🔍 **Automatic Resolution**: Resolves container numbers against the API on blur
- ➕ **Inline Creation**: Create new containers when valid number is not found
- 📋 **React Hook Form Integration**: Seamless integration with RHF via Controller
- ♿ **Accessible**: Full ARIA support, keyboard navigation, screen reader friendly
- 🎨 **Customizable**: Flexible styling via className props
- 🔄 **Loading States**: Built-in loading spinners and error handling
- 📝 **TypeScript**: Fully typed with comprehensive interfaces

## Installation

The component is part of the `@/features/containers` module. Import it directly:

```tsx
import { ContainerNumberPicker } from '@/features/containers';
```

## Basic Usage

### Standalone (Controlled)

```tsx
import { useState } from 'react';
import { ContainerNumberPicker } from '@/features/containers';
import type { ContainerFieldValue } from '@/features/containers';

function MyForm() {
  const [container, setContainer] = useState<ContainerFieldValue>({
    id: null,
    number: '',
    typeCode: null,
  });

  return (
    <ContainerNumberPicker
      value={container}
      onChange={setContainer}
      onResolved={({ value, existed }) => {
        console.log(`Container ${existed ? 'found' : 'created'}:`, value);
      }}
    />
  );
}
```

### With React Hook Form

```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ContainerNumberPicker, containerFieldSchema } from '@/features/containers';

const formSchema = z.object({
  container: containerFieldSchema,
});

type FormData = z.infer<typeof formSchema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      container: { id: null, number: '', typeCode: null },
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => console.log(data))}>
      <Controller
        control={form.control}
        name="container"
        render={({ field, fieldState }) => (
          <ContainerNumberPicker
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            required
          />
        )}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

## Props API

### ContainerNumberPickerProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `ContainerFieldValue` | - | Controlled value |
| `onChange` | `(value: ContainerFieldValue) => void` | - | Change handler |
| `onResolved` | `OnResolvedCallback` | - | Callback after resolution/creation |
| `error` | `string` | - | External error message (e.g., from RHF) |
| `name` | `string` | `"container"` | Form field name |
| `label` | `string` | `"Container Number"` | Label text |
| `typeLabel` | `string` | `"Container Type"` | Type display label |
| `placeholder` | `string` | `"Enter container number"` | Placeholder text |
| `disabled` | `boolean` | `false` | Disabled state |
| `required` | `boolean` | `false` | Required field indicator |
| `autoFocus` | `boolean` | `false` | Auto-focus on mount |
| `allowCreateWhenNotFound` | `boolean` | `true` | Show create button when not found |
| `resolveOnBlur` | `boolean` | `true` | Trigger resolution on blur |
| `hideTypeBox` | `boolean` | `false` | Hide type display box |
| `className` | `string` | `""` | Container wrapper class |
| `inputClassName` | `string` | `""` | Input field class |
| `typeBoxClassName` | `string` | `""` | Type display box class |

### ContainerFieldValue

```typescript
{
  id: string | null;       // Container UUID (null until resolved/created)
  number: string;          // ISO 6346 container number
  typeCode: string | null; // Container type code (null until resolved/created)
}
```

### OnResolvedCallback

```typescript
type OnResolvedCallback = (params: {
  value: ContainerFieldValue;
  existed: boolean;        // true if found, false if created
  raw?: Container;         // Full container object from API
}) => void;
```

## Imperative Handle

Access component methods via ref:

```tsx
import { useRef } from 'react';
import { ContainerNumberPicker } from '@/features/containers';
import type { ContainerNumberPickerHandle } from '@/features/containers';

function MyForm() {
  const pickerRef = useRef<ContainerNumberPickerHandle>(null);

  const handleValidate = () => {
    const isValid = pickerRef.current?.validate();
    console.log('Is valid:', isValid);
  };

  const handleResolve = async () => {
    await pickerRef.current?.resolve();
  };

  const handleReset = () => {
    pickerRef.current?.reset();
  };

  return (
    <div>
      <ContainerNumberPicker ref={pickerRef} {...props} />
      <button onClick={handleValidate}>Validate</button>
      <button onClick={handleResolve}>Resolve</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
}
```

## Validation

The component uses ISO 6346 standard validation:

### Valid Examples
- `MSCU6639870` ✅
- `TEMU9876540` ✅
- `CMAU1234564` ✅
- `mscu 663 987 0` ✅ (normalized automatically)

### Invalid Examples
- `MSCU6639871` ❌ (wrong check digit)
- `ABC123` ❌ (invalid format)
- `MSCU663987` ❌ (too short)

## Flows

### 1. Existing Container Flow

```
User enters number → Blur → Validation → API lookup
  ↓
Container found → Populate id + typeCode → Fire onResolved
```

### 2. New Container Flow

```
User enters number → Blur → Validation → API lookup → 404
  ↓
Show [+] button → User clicks → Modal opens
  ↓
User selects type → Click Save → API create
  ↓
Success → Populate id + number + typeCode → Fire onResolved
```

### 3. Invalid Input Flow

```
User enters number → Blur → Validation fails
  ↓
Show error message → Block API calls
```

## Accessibility

- **ARIA Labels**: All inputs properly labeled
- **Error Announce**: Errors announced with `role="alert"`
- **Keyboard Navigation**:
  - `Enter` triggers resolution
  - `Tab` navigates between fields
  - `Esc` closes modal
- **Focus Management**: Focus returns to trigger after modal close
- **Screen Reader**: Tested with NVDA and VoiceOver

## Testing

The component includes comprehensive unit tests. Run tests with:

```bash
npm test -- src/features/containers/components/container-list/ContainerNumberPicker
```

Test coverage includes:
- Rendering with various props
- Input handling and validation
- Resolution flows (found/not found)
- Modal creation flow
- Keyboard navigation
- Accessibility features

## Styling

The component uses Tailwind CSS. Customize via className props:

```tsx
<ContainerNumberPicker
  className="my-custom-wrapper"
  inputClassName="my-custom-input"
  typeBoxClassName="my-custom-type-box"
/>
```

## Dependencies

- React 18+
- React Hook Form
- Zod
- TanStack Query
- lucide-react (icons)
- Tailwind CSS

## Related Components

- `CreateContainerModal`: Modal for creating new containers (used internally)

## Related Utilities

- `isValidISO6346`: ISO 6346 validator function
- `normalizeContainerNumber`: Normalize to uppercase and remove spaces
- `containerNumberSchema`: Zod schema for validation
- `containerFieldSchema`: Zod schema for the full field value

## Example: Complete Form

See `src/pages/development/ContainerPickerExamplePage.tsx` for a complete working example with React Hook Form integration.

## Troubleshooting

### Issue: Validation not triggering on blur
**Solution**: Ensure `resolveOnBlur={true}` (default). Local validation happens, but API call only occurs for valid inputs.

### Issue: Create button not showing
**Solution**:
1. Ensure `allowCreateWhenNotFound={true}` (default)
2. Check that number is valid (passes ISO 6346 validation)
3. Verify API returns 404 (not 500 or other error)

### Issue: Types not loading in modal
**Solution**: Check that `useContainerTypes` hook is working and MSW mocks are active in test environment.

## License

Internal use only - Part of TOS Platform Frontend
