import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { ModelDownloader } from '../services/ModelDownloader';
import { useTheme } from '../contexts/ThemeContext';
import { formatSatsCompact } from '../utils/pricing';

export type ModelType = 'local' | 'routstr'

export interface UnifiedModelItemProps {
  id: string
  name: string
  type: ModelType
  isSelected?: boolean
  onSelect: () => void
  // For local models
  repo?: string
  filename?: string
  size?: string
  mmproj?: string
  // For routstr models
  apiId?: string
  description?: string
  completionSatPerToken?: number
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedContainer: {
    backgroundColor: theme.colors.primaryLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  details: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sizeText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  downloadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  downloadedIndicator: {
    backgroundColor: '#4CAF50',
  },
  notDownloadedIndicator: {
    backgroundColor: theme.colors.border,
  },
  selectedText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  apiText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default function UnifiedModelItem({
  name,
  type,
  isSelected = false,
  onSelect,
  repo,
  filename,
  size,
  mmproj,
  apiId,
  description,
  completionSatPerToken,
}: UnifiedModelItemProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);



  useEffect(() => {
    if (type === 'local' && filename) {
      checkDownloadStatus();
    }
  }, [filename, type]);

  const checkDownloadStatus = async () => {
    if (!filename) {return;}

    try {
      setIsChecking(true);
      const mainModelDownloaded = await ModelDownloader.isModelDownloaded(filename);
      let allDownloaded = mainModelDownloaded;

      if (mmproj) {
        const mmprojDownloaded = await ModelDownloader.isModelDownloaded(mmproj);
        allDownloaded = mainModelDownloaded && mmprojDownloaded;
      }

      setIsDownloaded(allDownloaded);
    } catch (error) {
      console.error('Error checking download status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getDetails = () => {
    if (type === 'routstr') {return '';}

    const details: string[] = [];
    if (repo) {details.push(repo);}
    if (!isChecking) {details.push(isDownloaded ? 'Downloaded' : 'Not downloaded');}
    return details.join(' • ');
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selectedContainer]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          {!!getDetails() && <Text style={styles.details}>{getDetails()}</Text>}
        </View>

        <View style={styles.statusContainer}>
          {type === 'local' && !isChecking && (
            <>
              {size && <Text style={styles.sizeText}>{size}</Text>}
              <View
                style={[
                  styles.downloadIndicator,
                  isDownloaded ? styles.downloadedIndicator : styles.notDownloadedIndicator,
                ]}
              />
            </>
          )}

          {type === 'routstr' && typeof completionSatPerToken === 'number' && isFinite(completionSatPerToken) && (
            <Text style={styles.apiText}>{`~ ${formatSatsCompact(completionSatPerToken * 500)} sat / msg`}</Text>
          )}

          {isChecking && (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          )}

          {isSelected && (
            <Text style={styles.selectedText}>✓</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
