import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { schools } from '../../lib/schools';

export default function SignupCounselorScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    schoolId: '',
    schoolName: '',
    title: '',
    department: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.schoolId) e.schoolId = 'Please select a school';
    if (!form.title.trim()) e.title = 'Title is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    const { error } = await register({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
      role: 'counselor',
      schoolId: form.schoolId,
      schoolName: form.schoolName,
      title: form.title,
      department: form.department || undefined,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Sign Up Failed', error);
      return;
    }
    router.replace('/(app)/home');
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Counselor Sign Up</Text>

          <Field
            label="First Name"
            value={form.firstName}
            onChangeText={v => set('firstName', v)}
            error={errors.firstName}
            placeholder="Jane"
          />
          <Field
            label="Last Name"
            value={form.lastName}
            onChangeText={v => set('lastName', v)}
            error={errors.lastName}
            placeholder="Smith"
          />
          <Field
            label="Email"
            value={form.email}
            onChangeText={v => set('email', v)}
            error={errors.email}
            placeholder="you@school.edu"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Password"
            value={form.password}
            onChangeText={v => set('password', v)}
            error={errors.password}
            placeholder="Create a password"
            secureTextEntry
            hint="Must be at least 8 characters"
          />
          <Field
            label="Confirm Password"
            value={form.confirmPassword}
            onChangeText={v => set('confirmPassword', v)}
            error={errors.confirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
          />

          <Text style={[styles.label, { marginTop: 14 }]}>School</Text>
          <TouchableOpacity
            style={[styles.pickerBtn, errors.schoolId ? styles.inputError : null]}
            onPress={() => setShowSchoolPicker(true)}
          >
            <Text style={form.schoolId ? styles.pickerValue : styles.pickerPlaceholder}>
              {form.schoolId ? form.schoolName : 'Select your school'}
            </Text>
          </TouchableOpacity>
          {errors.schoolId ? <Text style={styles.errorText}>{errors.schoolId}</Text> : null}

          <Field
            label="Title"
            value={form.title}
            onChangeText={v => set('title', v)}
            error={errors.title}
            placeholder="e.g. School Counselor"
          />
          <Field
            label="Department (optional)"
            value={form.department}
            onChangeText={v => set('department', v)}
            placeholder="e.g. College Guidance"
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showSchoolPicker} animationType="slide">
        <SafeAreaView style={styles.flex}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select School</Text>
            <TouchableOpacity onPress={() => setShowSchoolPicker(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={schools}
            keyExtractor={s => s.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.schoolItem}
                onPress={() => {
                  set('schoolId', item.id);
                  set('schoolName', item.name);
                  setShowSchoolPicker(false);
                }}
              >
                <Text style={styles.schoolItemName}>{item.name}</Text>
                <Text style={styles.schoolItemSub}>
                  {item.city}, {item.state}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  error,
  hint,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#95A2B6"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
      />
      {hint && !error ? <Text style={styles.hintText}>{hint}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  scroll: { padding: 24, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
  title: { fontSize: 26, fontFamily: 'Manrope_700Bold', color: '#17233D', marginBottom: 20 },
  label: { fontSize: 13, fontFamily: 'PublicSans_600SemiBold', color: '#36425A', marginBottom: 7 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E6EBF2',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'PublicSans_400Regular',
    color: '#17233D',
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#E5483B' },
  hintText: { fontSize: 12, fontFamily: 'PublicSans_500Medium', color: '#64728A', marginTop: 3 },
  errorText: { fontSize: 12, fontFamily: 'PublicSans_500Medium', color: '#E5483B', marginTop: 3 },
  btn: {
    backgroundColor: '#1E73CE',
    borderRadius: 9,
    height: 46,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#1E73CE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 5,
  },
  btnDisabled: {
    backgroundColor: '#EAEEF4',
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  pickerBtn: {
    borderWidth: 1.5,
    borderColor: '#E6EBF2',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#fff',
  },
  pickerValue: { fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#17233D' },
  pickerPlaceholder: { fontSize: 15, fontFamily: 'PublicSans_400Regular', color: '#95A2B6' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EBF2',
  },
  modalTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold', color: '#17233D' },
  modalClose: { fontSize: 15, fontFamily: 'PublicSans_600SemiBold', color: '#1E73CE' },
  schoolItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F7FB',
  },
  schoolItemName: { fontSize: 15, fontFamily: 'PublicSans_500Medium', color: '#17233D' },
  schoolItemSub: { fontSize: 13, fontFamily: 'PublicSans_400Regular', color: '#64728A', marginTop: 2 },
});
