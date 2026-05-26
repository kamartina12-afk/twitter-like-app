import { StyleSheet } from 'react-native';

export const registerStyles = StyleSheet.create({
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  stepChip: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepChipActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  stepChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepChipTextActive: {
    color: '#f9fafb',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  phonePrefixInput: {
    width: 88,
  },
  phoneInput: {
    flex: 1,
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
  },
  datePickerButtonPressed: {
    backgroundColor: '#f8fafc',
  },
  datePickerButtonError: {
    borderColor: '#ef4444',
  },
  datePickerButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerLeading: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerLeadingIcon: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: '#334155',
  },
  datePickerCopy: {
    flex: 1,
  },
  datePickerButtonText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
  },
  datePickerButtonTextPlaceholder: {
    color: '#475569',
    fontWeight: '500',
  },
  datePickerHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#334155',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 26,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    textAlign: 'center',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pickerAction: {
    flex: 1,
  },
  actionsGroup: {
    marginTop: 4,
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBack: {
    flex: 0.9,
  },
  actionSubmit: {
    flex: 1.6,
  },
  resendButton: {
    width: '100%',
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
  successText: {
    fontSize: 13,
    color: '#047857',
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

export default function RegisterStylesRoute() {
  return null;
}
