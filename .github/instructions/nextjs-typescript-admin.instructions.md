---
description: 'Comprehensive coding standards and best practices for NextJS TypeScript Admin web applications'
applyTo: '**/*.ts,**/*.tsx,**/pages/**/*,**/app/**/*,**/components/**/*,**/lib/**/*,**/utils/**/*'
---

# NextJS TypeScript Admin Application Guidelines

## Core Requirements & Standards

### TypeScript Configuration
- Use strict TypeScript settings with `strict: true` in `tsconfig.json`
- Enable `noUncheckedIndexedAccess` to prevent undefined access errors
- Prefer explicit types over `any` - use proper typing for all props, state, and API responses
- Use proper generic constraints and utility types (`Pick`, `Omit`, `Partial`, `Required`)
- Define interfaces for all data structures, API responses, and component props

### Next.js Architecture Standards
- Use App Router for new projects (`app/` directory structure)
- Implement proper Server and Client Component separation
- Use Server Actions for form submissions and data mutations
- Leverage Static Generation (SSG) for admin dashboards where appropriate
- Implement proper loading states with `loading.tsx` files
- Create proper error boundaries with `error.tsx` files

## Implementation Patterns

### Component Architecture
```typescript
// Admin components should be strongly typed
interface AdminTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  onEdit: (item: T) => void;
  onDelete: (id: string) => Promise<void>;
  isLoading?: boolean;
}

// Use proper generic constraints for reusable components
export function AdminTable<T extends { id: string }>({ 
  data, 
  columns, 
  onEdit, 
  onDelete,
  isLoading = false 
}: AdminTableProps<T>) {
  // Implementation
}
```

### Data Fetching Patterns
- Use Server Components for initial data fetching
- Implement proper error handling with try/catch blocks
- Use React Query or SWR for client-side data fetching and caching
- Create custom hooks for complex data operations
- Implement optimistic updates for better UX

### API Route Organization
```typescript
// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'user', 'moderator']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = UserSchema.parse(body);
    
    // Implementation
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

### Form Handling Standards
- Use React Hook Form with TypeScript for all forms
- Implement proper validation with Zod schemas
- Create reusable form components with consistent styling
- Use controlled components for complex form interactions
- Implement proper loading states and error display

## Best Practices

### Performance & Optimization
- Use `next/dynamic` for code splitting large admin components
- Implement proper image optimization with `next/image`
- Use `next/font` for font optimization
- Implement proper caching strategies for API responses
- Use React.memo() for expensive components that don't change often
- Implement virtual scrolling for large data tables

### State Management
- Use React Context for global admin state (user permissions, theme, etc.)
- Prefer server state libraries (React Query, SWR) over client state for data
- Use Zustand or Jotai for complex client-side state management
- Avoid prop drilling - use context or state management libraries
- Keep state as close to where it's needed as possible

### Security Considerations
- Implement proper authentication checks in middleware
- Use role-based access control (RBAC) for admin features
- Sanitize all user inputs and validate on both client and server
- Use environment variables for sensitive configuration
- Implement proper session management and token handling
- Add CSRF protection for state-changing operations

### UI/UX Standards
- Use a consistent design system (shadcn/ui, Ant Design, or Material-UI)
- Implement proper loading states for all async operations
- Provide clear error messages and recovery options
- Use proper ARIA labels and semantic HTML for accessibility
- Implement keyboard navigation for all interactive elements
- Provide proper feedback for all user actions

## Common Patterns

### Admin Layout Structure
```typescript
// app/admin/layout.tsx
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Data Table Component
- Create reusable table components with sorting, filtering, and pagination
- Use proper TypeScript generics for type safety
- Implement bulk actions with proper confirmation dialogs
- Add export functionality for data tables
- Use proper loading skeletons while data is fetching

### Dashboard Components
- Create modular dashboard widgets with consistent sizing
- Implement proper responsive design for different screen sizes
- Use proper chart libraries with TypeScript support (Recharts, Chart.js)
- Implement real-time updates where appropriate
- Create customizable dashboard layouts

### Form Components
```typescript
// Reusable admin form pattern
interface AdminFormProps<T> {
  initialData?: T;
  onSubmit: (data: T) => Promise<void>;
  validationSchema: z.ZodSchema<T>;
  isLoading?: boolean;
}

export function AdminForm<T>({ 
  initialData, 
  onSubmit, 
  validationSchema,
  isLoading = false 
}: AdminFormProps<T>) {
  const form = useForm<T>({
    resolver: zodResolver(validationSchema),
    defaultValues: initialData,
  });

  // Implementation
}
```

## Error Handling & Validation

### Client-Side Error Handling
- Use Error Boundaries to catch and display component errors gracefully
- Implement proper form validation with clear error messages
- Use toast notifications for user feedback
- Log errors to monitoring services (Sentry, LogRocket)
- Provide fallback UI for failed data loading

### Server-Side Error Handling
- Use proper HTTP status codes in API responses
- Implement structured error responses with consistent format
- Add request validation middleware for all API routes
- Use proper logging for debugging and monitoring
- Implement rate limiting for API endpoints

### Input Validation
```typescript
// Use Zod for consistent validation
const AdminUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'user', 'moderator']),
  permissions: z.array(z.string()).optional(),
});

type AdminUser = z.infer<typeof AdminUserSchema>;
```

## Testing & Quality Assurance

### Testing Strategy
- Write unit tests for utility functions and custom hooks
- Use React Testing Library for component testing
- Implement integration tests for complex user flows
- Use Playwright or Cypress for end-to-end testing
- Test error states and loading conditions
- Mock API calls in tests for consistency

### Code Quality
- Use ESLint with TypeScript rules and accessibility plugins
- Configure Prettier for consistent code formatting
- Use Husky for pre-commit hooks
- Implement proper TypeScript path mapping
- Use absolute imports with proper alias configuration

### Performance Testing
- Monitor Core Web Vitals for admin pages
- Use Lighthouse for performance auditing
- Implement proper bundle analysis
- Monitor API response times
- Test with realistic data volumes

## Performance & Optimization

### Bundle Optimization
- Use dynamic imports for admin-specific code
- Implement proper tree shaking
- Optimize third-party library usage
- Use proper code splitting strategies
- Monitor and optimize bundle size

### Data Loading Optimization
- Implement proper pagination for large datasets
- Use virtual scrolling for long lists
- Cache frequently accessed data
- Implement proper prefetching strategies
- Use debounced search for better performance

### Image and Asset Optimization
- Use next/image for all images with proper sizing
- Implement proper lazy loading
- Use appropriate image formats (WebP, AVIF)
- Optimize SVG icons and illustrations
- Use CDN for static assets

## Troubleshooting & Common Issues

### TypeScript Issues
- **Strict null checks**: Always handle potential undefined values
- **Type assertions**: Avoid `as any`, use proper type guards instead
- **Generic constraints**: Use proper bounds for generic types
- **Module imports**: Configure proper path mapping in tsconfig.json

### Next.js Specific Issues
- **Hydration errors**: Ensure server and client render the same content
- **API route errors**: Implement proper error handling and status codes
- **Static generation**: Use proper data fetching methods for SSG/ISR
- **Client-side routing**: Use Next.js router for navigation

### Performance Issues
- **Large bundle size**: Use dynamic imports and code splitting
- **Slow API responses**: Implement proper caching and pagination
- **Memory leaks**: Clean up event listeners and subscriptions
- **Render performance**: Use React.memo and useMemo appropriately

### Common Anti-Patterns to Avoid
- Don't use `any` type - always provide proper typing
- Avoid client-side data fetching for initial page loads
- Don't skip error boundaries - always provide fallback UI
- Avoid deeply nested component props - use context or state management
- Don't ignore accessibility - implement proper ARIA labels and keyboard navigation
- Avoid hardcoded strings - use proper internationalization setup

## Security Best Practices

### Authentication & Authorization
- Implement proper JWT token handling and refresh logic
- Use secure HTTP-only cookies for sensitive tokens
- Implement proper role-based access control checks
- Add middleware for route protection
- Use secure password hashing (bcrypt, Argon2)

### Data Security
- Validate and sanitize all inputs on both client and server
- Use parameterized queries to prevent SQL injection
- Implement proper CORS configuration
- Add security headers (CSP, HSTS, X-Frame-Options)
- Use HTTPS in production environments

### Admin-Specific Security
- Implement proper audit logging for admin actions
- Add confirmation dialogs for destructive operations
- Use proper session timeout for admin users
- Implement proper privilege escalation protection
- Add IP whitelisting for admin access if required