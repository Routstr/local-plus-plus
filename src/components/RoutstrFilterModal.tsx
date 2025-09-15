import React, { useEffect, useMemo, useState } from 'react';
import BaseParameterModal from './BaseParameterModal';
import { ParameterTextInput } from './ParameterFormFields';
import { ParameterMenu } from './ParameterMenu';

export interface RoutstrFilter {
  searchTerm?: string
  provider?: string
  maxSatPerToken?: number
}

interface RoutstrFilterModalProps {
  visible: boolean
  onClose: () => void
  onSave: (filter: RoutstrFilter) => void
  onClear: () => void
  initialFilter?: RoutstrFilter
  providers: string[]
}

export default function RoutstrFilterModal({
  visible,
  onClose,
  onSave,
  onClear,
  initialFilter,
  providers,
}: RoutstrFilterModalProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [provider, setProvider] = useState<string | undefined>(undefined);
  const [maxSatPerToken, setMaxSatPerToken] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setSearchTerm(initialFilter?.searchTerm || '');
      setProvider(initialFilter?.provider || undefined);
      setMaxSatPerToken(
        typeof initialFilter?.maxSatPerToken === 'number' && isFinite(initialFilter.maxSatPerToken)
          ? String(initialFilter.maxSatPerToken)
          : '',
      );
    }
  }, [initialFilter, visible]);

  const providerOptions = useMemo(() => providers, [providers]);

  const handleSave = () => {
    const parsedMax = maxSatPerToken.trim().length > 0 ? Number(maxSatPerToken) : NaN;
    const next: RoutstrFilter = {
      searchTerm: searchTerm.trim() || undefined,
      provider: provider || undefined,
      maxSatPerToken: Number.isFinite(parsedMax) ? parsedMax : undefined,
    };
    onSave(next);
    onClose();
  };

  const handleReset = () => {
    setSearchTerm('');
    setProvider(undefined);
    setMaxSatPerToken('');
    onClear();
  };

  return (
    <BaseParameterModal
      visible={visible}
      onClose={onClose}
      title="Filter Models"
      description="Filter Routstr models by provider, price, or search term."
      isLoading={false}
      onSave={handleSave}
      onReset={handleReset}
    >
      <ParameterTextInput
        label="Search"
        description="Search by model name or ID."
        value={searchTerm}
        onChangeText={setSearchTerm}
        placeholder="e.g. claude, deepseek, llama"
        keyboardType="ascii-capable"
      />

      <ParameterMenu
        label="Provider"
        description="Filter by provider parsed from model ID."
        value={provider}
        options={providerOptions}
        onSelect={(value) => setProvider(value)}
        placeholder="Any"
      />

      <ParameterTextInput
        label="Max price (sat / token)"
        description="Include models with completion price ≤ this value."
        value={maxSatPerToken}
        onChangeText={setMaxSatPerToken}
        placeholder="e.g. 1.2"
        keyboardType="decimal-pad"
      />
    </BaseParameterModal>
  );
}


