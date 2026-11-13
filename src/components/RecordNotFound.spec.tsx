import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecordNotFound, { isNotFoundError } from './RecordNotFound';

function setup() {
    render(
        <MemoryRouter initialEntries={['/detail/foreign']}>
            <Routes>
                <Route path="/detail/:id" element={<RecordNotFound listPath="/list" listLabel="Flows" />} />
                <Route path="/list" element={<div>list page</div>} />
            </Routes>
        </MemoryRouter>,
    );
}

describe('RecordNotFound', () => {
    it('given a foreign id when rendered then it shows the not-found title and description', () => {
        setup();
        expect(screen.getByText('Record not found')).toBeTruthy();
        expect(screen.getByText("This record doesn't exist or you don't have access to it.")).toBeTruthy();
    });

    it('given the not-found state when Back is clicked then it navigates to the list', async () => {
        setup();
        await userEvent.click(screen.getByRole('button', { name: 'Back to Flows' }));
        expect(screen.getByText('list page')).toBeTruthy();
    });

    it('given a 404 or 403 error when classified then it is not-found, and a 500 is not', () => {
        expect(isNotFoundError({ status: 404 })).toBe(true);
        expect(isNotFoundError({ status: 403 })).toBe(true);
        expect(isNotFoundError({ response: { status: 403 } })).toBe(true);
        expect(isNotFoundError({ status: 500 })).toBe(false);
        expect(isNotFoundError(null)).toBe(false);
    });
});
