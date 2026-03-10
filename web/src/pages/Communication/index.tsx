import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ComposeTab from './ComposeTab';
import TemplatesTab from './TemplatesTab';
import LogsTab from './LogsTab';
import { PageHeader } from '@/components/ui/PageHeader';

type Tab = 'compose' | 'templates' | 'logs';

const TABS: { value: Tab; label: string }[] = [
  { value: 'compose', label: 'Compose' },
  { value: 'templates', label: 'Templates' },
  { value: 'logs', label: 'Logs' },
];

export default function CommunicationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('compose');

  function handleSendSuccess() {
    setActiveTab('logs');
  }

  function handleNewTemplate() {
    setActiveTab('templates');
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Communication"
        subtitle="Send messages, manage templates, and view notification logs"
        icon={<MessageSquare className="h-5 w-5" />}
        actions={
          <Button variant="outline" onClick={handleNewTemplate}>
            + New Template
          </Button>
        }
      />

      {/* Desktop tab bar */}
      <div className="hidden md:flex border-b">
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${
                activeTab === value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              }`}
            aria-selected={activeTab === value}
            role="tab"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pb-20 md:pb-0">
        {activeTab === 'compose' && <ComposeTab onSendSuccess={handleSendSuccess} />}
        {activeTab === 'templates' && <TemplatesTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>

      {/* Mobile bottom tab nav */}
      <nav
        aria-label="Communication navigation"
        className="fixed bottom-0 left-0 right-0 border-t bg-background md:hidden flex"
      >
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={`flex-1 py-3 text-xs font-medium transition-colors
              ${activeTab === value ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            aria-selected={activeTab === value}
            role="tab"
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
