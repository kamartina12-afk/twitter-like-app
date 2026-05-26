import { StyleSheet } from 'react-native';

export const loginStyles = StyleSheet.create({
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020617',
    marginBottom: 4,
  },
  labelDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
});

export default function LoginStylesRoute() {
  return null;
}
