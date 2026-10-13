import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { TopicId } from '@career-log/shared';
import { TopicPicker } from '@/components/TopicPicker';

function Harness({ initial = [] as TopicId[], max = 6 }) {
  const [value, setValue] = useState<TopicId[]>(initial);
  return <TopicPicker value={value} onChange={setValue} summary="Count paths in a grid" roundType="coding" max={max} />;
}

describe('TopicPicker', () => {
  it('adds a suggested topic and shows it as removable', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByText('0/6')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Arrays/ }));
    expect(screen.getByText('1/6')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Arrays' }));
    expect(screen.getByText('0/6')).toBeInTheDocument();
  });

  it('finds topics by search and adds the first match on Enter', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Search topics'), 'netw{Enter}');
    expect(screen.getByRole('button', { name: 'Remove Computer networks' })).toBeInTheDocument();
  });

  it('disables further picks at the limit', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['dp']} max={1} />);
    expect(screen.getByLabelText('Search topics')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Browse all topics/ }));
    expect(screen.getByRole('button', { name: /^Graphs$/ })).toBeDisabled();
  });
});
