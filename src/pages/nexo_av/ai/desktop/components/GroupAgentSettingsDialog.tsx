import { useState, useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { GroupAgentSettings } from '../../logic/hooks/useGroupAgentSettings';

interface GroupAgentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupTitle: string;
  conversationId: string;
  settings: GroupAgentSettings;
  loading: boolean;
  saving: boolean;
  onSave: (conversationId: string, updates: {
    agent_name?: string;
    model?: string;
    auto_mode?: boolean;
    intervention_level?: string;
    cooldown_minutes?: number;
  }) => Promise<boolean>;
}

const INTERVENTION_LABELS: Record<string, { label: string; description: string; color: string }> = {
  low: { label: 'Bajo', description: 'Solo observa y registra eventos', color: 'text-blue-500' },
  medium: { label: 'Medio', description: 'Sugiere acciones en el grupo', color: 'text-yellow-500' },
  high: { label: 'Alto', description: 'Interviene activamente', color: 'text-red-500' },
};

const MODEL_OPTIONS = [
  { value: 'qwen2.5:3b', label: 'Qwen 2.5 3B (actual)' },
  { value: 'qwen2.5:7b', label: 'Qwen 2.5 7B' },
  { value: 'llama3.2:3b', label: 'Llama 3.2 3B' },
  { value: 'mistral:7b', label: 'Mistral 7B' },
];

const GroupAgentSettingsDialog = ({
  open,
  onOpenChange,
  groupTitle,
  conversationId,
  settings,
  loading,
  saving,
  onSave,
}: GroupAgentSettingsDialogProps) => {
  const [autoMode, setAutoMode] = useState(false);
  const [model, setModel] = useState('qwen2.5:3b');
  const [interventionLevel, setInterventionLevel] = useState('medium');
  const [cooldown, setCooldown] = useState(10);
  const [agentName, setAgentName] = useState('NEXO AI');

  useEffect(() => {
    if (settings) {
      setAutoMode(settings.auto_mode);
      setModel(settings.model);
      setInterventionLevel(settings.intervention_level);
      setCooldown(settings.cooldown_minutes);
      setAgentName(settings.agent_name);
    }
  }, [settings]);

  const handleSave = async () => {
    const success = await onSave(conversationId, {
      agent_name: agentName,
      model,
      auto_mode: autoMode,
      intervention_level: interventionLevel,
      cooldown_minutes: cooldown,
    });
    if (success) {
      onOpenChange(false);
    }
  };

  const interventionCfg = INTERVENTION_LABELS[interventionLevel] || INTERVENTION_LABELS.medium;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Configuración del Agente
          </DialogTitle>
          <DialogDescription>
            Configuración del agente autónomo para <strong>{groupTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Auto mode toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Modo Automático</Label>
                <p className="text-xs text-muted-foreground">
                  Permite al agente intervenir automáticamente en el grupo
                </p>
              </div>
              <div className="flex items-center gap-2">
                {autoMode ? (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20 border">Auto</Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">Manual</Badge>
                )}
                <Switch checked={autoMode} onCheckedChange={setAutoMode} />
              </div>
            </div>

            {/* Agent name */}
            <div className="space-y-2">
              <Label htmlFor="agent-name">Nombre del agente</Label>
              <Input
                id="agent-name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="NEXO AI"
              />
            </div>

            {/* Model selector */}
            <div className="space-y-2">
              <Label>Modelo asignado</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                El modelo se usará cuando se active la lógica automática (V3 futura)
              </p>
            </div>

            {/* Intervention level */}
            <div className="space-y-2">
              <Label>Nivel de intervención</Label>
              <Select value={interventionLevel} onValueChange={setInterventionLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INTERVENTION_LABELS).map(([value, cfg]) => (
                    <SelectItem key={value} value={value}>
                      <span className={cfg.color}>{cfg.label}</span>
                      <span className="text-muted-foreground ml-2">— {cfg.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cooldown */}
            <div className="space-y-2">
              <Label htmlFor="cooldown">Cooldown (minutos)</Label>
              <Input
                id="cooldown"
                type="number"
                min={1}
                max={1440}
                value={cooldown}
                onChange={(e) => setCooldown(parseInt(e.target.value) || 10)}
              />
              <p className="text-[11px] text-muted-foreground">
                Tiempo mínimo entre intervenciones automáticas del agente
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupAgentSettingsDialog;
