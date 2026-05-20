import { useState } from 'react';
import type { ModActionOptions, QueueItemDto, RemovalReasonDto } from '../../shared/api.js';
import { modActionOptionsFromParts } from '../../shared/exact-optional.js';

export type ConfirmableAction = 'remove' | 'spam' | 'ban-user';

type ModActionDialogProps = {
  item: QueueItemDto;
  action: ConfirmableAction;
  removalReasons: RemovalReasonDto[];
  onConfirm: (options: ModActionOptions) => void;
  onCancel: () => void;
};

const ACTION_COPY: Record<
  ConfirmableAction,
  { title: string; confirmLabel: string; description: string }
> = {
  remove: {
    title: 'Remove content',
    confirmLabel: 'Remove',
    description: 'This will remove the item from the subreddit.',
  },
  spam: {
    title: 'Remove as spam',
    confirmLabel: 'Mark spam',
    description: 'This will remove the item and mark it as spam.',
  },
  'ban-user': {
    title: 'Ban author',
    confirmLabel: 'Ban user',
    description: 'Ban the author from this subreddit.',
  },
};

export const ModActionDialog = ({
  item,
  action,
  removalReasons,
  onConfirm,
  onCancel,
}: ModActionDialogProps) => {
  const copy = ACTION_COPY[action];
  const [note, setNote] = useState('');
  const [banDurationDays, setBanDurationDays] = useState(0);
  const [modNote, setModNote] = useState('');
  const [removalReasonId, setRemovalReasonId] = useState('');

  const handleSubmit = () => {
    const parts: Parameters<typeof modActionOptionsFromParts>[0] = {};
    if (action === 'ban-user') {
      if (note) {
        parts.note = note;
      }
      parts.banUsername = item.authorName.replace(/^u\//, '');
      if (banDurationDays > 0) {
        parts.banDurationDays = banDurationDays;
      }
    } else {
      if (modNote) {
        parts.modNote = modNote;
      }
      if ((action === 'remove' || action === 'spam') && removalReasonId) {
        parts.removalReasonId = removalReasonId;
      }
    }
    onConfirm(modActionOptionsFromParts(parts));
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mod-action-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="mod-action-title" className="modal__title">
          {copy.title}
        </h3>
        <p className="modal__desc">{copy.description}</p>
        <p className="modal__item-title">{item.title}</p>
        <p className="modal__meta">{item.authorName}</p>

        {action === 'ban-user' ? (
          <>
            <label className="modal__field">
              <span>Ban note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Reason for ban (visible to mods)"
              />
            </label>
            <label className="modal__field">
              <span>Ban length (days)</span>
              <input
                type="number"
                min={0}
                max={365}
                value={banDurationDays}
                onChange={(e) => setBanDurationDays(Number(e.target.value) || 0)}
              />
              <span className="modal__hint">0 = permanent ban</span>
            </label>
          </>
        ) : (
          <>
            {removalReasons.length > 0 && (
              <label className="modal__field">
                <span>Removal reason (optional)</span>
                <select
                  value={removalReasonId}
                  onChange={(e) => setRemovalReasonId(e.target.value)}
                >
                  <option value="">— None —</option>
                  {removalReasons.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="modal__field">
              <span>Mod note (optional)</span>
              <textarea
                value={modNote}
                onChange={(e) => setModNote(e.target.value)}
                rows={2}
                placeholder="Internal note for the removal"
              />
            </label>
          </>
        )}

        <div className="modal__actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn btn--${action === 'ban-user' ? 'danger' : 'danger'}`}
            onClick={handleSubmit}
          >
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
