import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { buttonClass } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState
        title="This page doesn't exist"
        action={
          <Link to="/" className={buttonClass('secondary')}>
            Go home
          </Link>
        }
      />
    </div>
  );
}
