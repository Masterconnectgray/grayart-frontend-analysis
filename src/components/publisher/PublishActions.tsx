import React from 'react';
import { Button } from '../../design-system';
import { Send, CalendarClock } from 'lucide-react';

interface PublishActionsProps {
  onPublishNow: () => void;
  onSchedule: () => void;
  isPublishing: boolean;
  publishSuccess: boolean;
  scheduleSuccess: boolean;
  selectedCount: number;
  publishDisabled?: boolean;
  scheduleDisabled?: boolean;
}

export const PublishActions: React.FC<PublishActionsProps> = ({
  onPublishNow,
  onSchedule,
  isPublishing,
  publishSuccess,
  scheduleSuccess,
  selectedCount,
  publishDisabled = false,
  scheduleDisabled = false,
}) => {
  return (
    <div className="flex flex-col gap-3 mt-6">
      <Button 
        size="lg" 
        fullWidth
        loading={isPublishing}
        disabled={publishDisabled}
        onClick={onPublishNow}
        className={publishSuccess ? '!bg-emerald-500 !text-white' : ''}
        icon={publishSuccess ? undefined : Send}
      >
        {publishSuccess ? 'Publicado com Sucesso!' : `Publicar em ${selectedCount} Redes`}
      </Button>

      <Button 
        variant="secondary"
        size="lg" 
        fullWidth
        disabled={scheduleDisabled}
        onClick={onSchedule}
        className={scheduleSuccess ? '!bg-emerald-500/20 !text-emerald-400 !border-emerald-500/50' : ''}
        icon={scheduleSuccess ? undefined : CalendarClock}
      >
        {scheduleSuccess ? 'Agendado!' : 'Agendar Publicação'}
      </Button>
    </div>
  );
};
