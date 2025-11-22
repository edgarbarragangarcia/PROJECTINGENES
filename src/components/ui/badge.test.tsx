import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge', () => {
    it('renders correctly', () => {
        render(<Badge>Test Badge</Badge>)
        expect(screen.getByText('Test Badge')).toBeDefined()
    })

    it('applies variant classes', () => {
        const { container } = render(<Badge variant="destructive">Destructive</Badge>)
        expect(container.firstChild).toBeDefined()
        // Check if the class contains destructive styles (checking for a substring is usually enough)
        // In badge.tsx: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80"
        expect(container.firstChild).toHaveProperty('className')
        const className = (container.firstChild as HTMLElement).className
        expect(className).toContain('bg-destructive')
    })

    it('applies custom className', () => {
        const { container } = render(<Badge className="custom-class">Custom</Badge>)
        const className = (container.firstChild as HTMLElement).className
        expect(className).toContain('custom-class')
    })
})
