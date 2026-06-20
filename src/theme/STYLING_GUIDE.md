# Styling Guide

## File Naming
- Use `.module.css` for component-specific styles
- Use `ComponentName.module.css` for the CSS module of `ComponentName.js`
- Keep global styles in `theme/global.css`
- Maintain variables in `theme/variables.css`

## Styling Approaches

### 1. CSS Modules (Recommended for Components)
```jsx
// Button.jsx
import styles from './Button.module.css';

function Button({ children }) {
  return <button className={styles.button}>{children}</button>;
}
```

```css
/* Button.module.css */
.button {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-primary);
  color: var(--color-text-on-dark);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.button:hover {
  background-color: var(--color-primary-dark);
}
```

### 2. Styled Components
For dynamic styling, use the `styled-components` library:

```jsx
import styled from 'styled-components';

const StyledButton = styled.button`
  padding: ${props => props.size === 'large' ? '1rem 2rem' : '0.5rem 1rem'};
  background-color: ${props => props.variant === 'primary' 
    ? 'var(--color-primary)' 
    : 'var(--color-secondary)'};
  color: var(--color-text-on-dark);
  border: none;
  border-radius: var(--border-radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    opacity: 0.9;
  }
`;

function Button({ children, variant = 'primary', size = 'medium' }) {
  return (
    <StyledButton variant={variant} size={size}>
      {children}
    </StyledButton>
  );
}
```

## Best Practices
1. **Use CSS Variables**: Always use variables from `variables.css` for consistency
2. **Mobile-First**: Write mobile styles first, then use media queries for larger screens
3. **BEM Naming**: Consider using BEM naming convention for complex components
4. **Avoid Inline Styles**: Only use inline styles for dynamic values
5. **Keep it Simple**: Start with minimal styles and add complexity as needed

## Responsive Design
Use these breakpoints for responsive design:

```css
/* Small devices (landscape phones, 576px and up) */
@media (min-width: 576px) { }

/* Medium devices (tablets, 768px and up) */
@media (min-width: 768px) { }

/* Large devices (desktops, 992px and up) */
@media (min-width: 992px) { }

/* Extra large devices (large desktops, 1200px and up) */
@media (min-width: 1200px) { }
```
