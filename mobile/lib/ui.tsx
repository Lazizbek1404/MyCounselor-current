import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows, typography, status as statusTokens, getAvatarColor, getInitials } from './theme';

// ── Button ─────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function AppButton({ label, onPress, variant = 'primary', disabled, style, icon }: ButtonProps) {
  const [pressed, setPressed] = useState(false);

  const bg = disabled
    ? '#EAEEF4'
    : variant === 'secondary'
    ? colors.card
    : variant === 'destructive'
    ? (pressed ? colors.dangerPressed : colors.danger)
    : pressed ? colors.primaryPressed : colors.primary;

  const textColor = disabled ? '#A6B1C2' : variant === 'secondary' ? colors.primary : colors.white;

  const shadow = disabled ? {}
    : variant === 'destructive' ? shadows.danger
    : variant === 'primary' ? shadows.primaryButton
    : {};

  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg }, shadow, variant === 'secondary' && s.btnSecondaryBorder, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={1}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
    >
      {icon && <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: 8 }} />}
      <Text style={[s.btnLabel, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Card ───────────────────────────────────────────────────────────────────────

export function AppCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

// ── StatusBadge ────────────────────────────────────────────────────────────────

type StatusKey = 'pending' | 'in_progress' | 'approved' | 'closed';

export function StatusBadge({ status }: { status: StatusKey }) {
  const key = status === 'in_progress' ? 'inProgress' : status;
  const t = statusTokens[key as keyof typeof statusTokens];
  const label = status === 'in_progress' ? 'In Progress'
    : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <View style={[s.badge, { backgroundColor: t.bg }]}>
      <View style={[s.badgeDot, { backgroundColor: t.dot }]} />
      <Text style={[s.badgeLabel, { color: t.text }]}>{label}</Text>
    </View>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

interface AvatarProps {
  name: string;
  size?: 56 | 44 | 36 | 28;
  style?: ViewStyle;
}

export function AppAvatar({ name, size = 44, style }: AvatarProps) {
  const bg = getAvatarColor(name);
  const initials = getInitials(name);
  const fontSize = Math.round(size * 0.34);
  return (
    <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, style]}>
      <Text style={[s.avatarText, { fontSize }]}>{initials}</Text>
    </View>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────────

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  error?: string;
  style?: ViewStyle;
}

export function AppInput({
  label, value, onChangeText, placeholder, multiline, maxLength,
  secureTextEntry, autoCapitalize, keyboardType, error, style,
}: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: spacing.base }, style]}>
      {label ? <Text style={s.inputLabel}>{label}</Text> : null}
      <View style={[
        s.inputWrap,
        focused && s.inputFocused,
        error ? s.inputError : null,
        multiline ? s.inputMultiline : null,
      ]}>
        <TextInput
          style={[s.inputText, multiline && s.inputTextMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.faint400}
          multiline={multiline}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          blurOnSubmit={!multiline}
        />
      </View>
      {error ? <Text style={s.inputErrorText}>{error}</Text> : null}
    </View>
  );
}

// ── SendButton ─────────────────────────────────────────────────────────────────

export function SendButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.sendBtn, disabled && s.sendBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Ionicons name="paper-plane" size={18} color={colors.white} />
    </TouchableOpacity>
  );
}

// ── UnreadBadge ────────────────────────────────────────────────────────────────

export function UnreadBadge({ count, useCorал = false }: { count: number; useCorал?: boolean }) {
  if (count <= 0) return null;
  return (
    <View style={[s.unread, { backgroundColor: useCorал ? colors.coral : colors.primary }]}>
      <Text style={s.unreadText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={s.emptySub}>{subtitle}</Text> : null}
      {action ? <AppButton label={action.label} onPress={action.onPress} style={{ marginTop: spacing.lg }} /> : null}
    </View>
  );
}

// ── Spinner ────────────────────────────────────────────────────────────────────

export function AppSpinner({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <View style={[s.spinnerWrap, !fullScreen && { flex: 0, paddingVertical: spacing.xxxl }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  btn: {
    height: 46,
    borderRadius: radius.control,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryBorder: { borderWidth: 1.5, borderColor: '#CFE0F4' },
  btnLabel: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 15,
    lineHeight: 18,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.sm,
    ...shadows.card,
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 11,
    gap: 5,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4 },
  badgeLabel: {
    fontFamily: 'PublicSans_700Bold',
    fontSize: 12,
    lineHeight: 14,
  },

  avatar: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: colors.white, fontFamily: 'Manrope_700Bold' },

  inputLabel: {
    fontFamily: 'PublicSans_600SemiBold',
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink700,
    marginBottom: 7,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
  },
  inputFocused: { borderColor: colors.primary },
  inputError: { borderColor: colors.danger },
  inputMultiline: { minHeight: 70, paddingTop: spacing.md, alignItems: 'flex-start' },
  inputText: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink900,
    padding: 0,
  },
  inputTextMulti: { textAlignVertical: 'top', minHeight: 56 },
  inputErrorText: {
    fontFamily: 'PublicSans_500Medium',
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },

  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.fab,
  },
  sendBtnDisabled: { opacity: 0.35 },

  unread: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  unreadText: {
    color: colors.white,
    fontFamily: 'PublicSans_700Bold',
    fontSize: 10,
    lineHeight: 12,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.base,
  },
  emptyTitle: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink900,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: 'PublicSans_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted500,
    textAlign: 'center',
    maxWidth: 280,
  },

  spinnerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
});
