import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';

export default function RiderRegistrationScreen({ navigation }: any) {
  const { riderRegister } = useAuth();

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    license_number: '',
    vehicle_type: 'motorcycle' as 'motorcycle' | 'bicycle' | 'car',
    vehicle_number: '',
    emergency_contact: '',
    area_coverage: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Form validation
  const validateForm = (): string | null => {
    if (!formData.username.trim()) {
      return 'Username is required';
    }
    if (!formData.email.trim()) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return 'Invalid email format';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    if (!formData.phone.trim()) {
      return 'Phone number is required';
    }
    if (!/^\+?[\d\s-]+$/.test(formData.phone)) {
      return 'Invalid phone number format';
    }
    if (!formData.license_number.trim()) {
      return 'License number is required';
    }
    if (!formData.vehicle_number.trim()) {
      return 'Vehicle number is required';
    }
    if (!formData.emergency_contact.trim()) {
      return 'Emergency contact is required';
    }
    if (!formData.area_coverage.trim()) {
      return 'Area coverage is required';
    }
    if (!acceptedTerms) {
      return 'You must accept the terms and conditions';
    }
    return null;
  };

  const handleRegister = async () => {
    try {
      setError(null);
      
      // Validate form
      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);

      // Extract data (without confirmPassword)
      const { confirmPassword, ...registerData } = formData;

      // Call register API
      const success = await riderRegister(registerData);

      if (success) {
        Alert.alert(
          'Success!',
          'Registration successful! Welcome to GasFill',
          [{ text: 'OK' }]
        );
        // AuthContext will handle navigation to RiderDashboard
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Mark field as touched
    setTouchedFields((prev) => new Set(prev).add(field));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const getFieldError = (field: string): string | null => {
    if (!touchedFields.has(field)) return null;

    switch (field) {
      case 'username':
        return !formData.username.trim() ? 'Username is required' : null;
      case 'email':
        if (!formData.email.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Invalid email';
        return null;
      case 'password':
        if (formData.password.length < 6) return 'Min. 6 characters';
        return null;
      case 'confirmPassword':
        if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
        return null;
      case 'phone':
        if (!formData.phone.trim()) return 'Phone is required';
        if (!/^\+?[\d\s-]+$/.test(formData.phone)) return 'Invalid phone number';
        return null;
      case 'license_number':
        return !formData.license_number.trim() ? 'License is required' : null;
      case 'vehicle_number':
        return !formData.vehicle_number.trim() ? 'Vehicle number is required' : null;
      case 'emergency_contact':
        return !formData.emergency_contact.trim() ? 'Emergency contact is required' : null;
      case 'area_coverage':
        return !formData.area_coverage.trim() ? 'Area coverage is required' : null;
      default:
        return null;
    }
  };

  if (loading) {
    return <Loading message="Creating your rider account..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Become a Rider</Text>
          <Text style={styles.subtitle}>
            Fill in your details to start delivering with GasFill
          </Text>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <ErrorDisplay
              message={error}
              onRetry={() => setError(null)}
              retryText="Dismiss"
            />
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {/* Personal Information Section */}
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Username <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                getFieldError('username') && styles.inputError,
                touchedFields.has('username') && !getFieldError('username') && formData.username && styles.inputSuccess,
              ]}
              placeholder="Enter your username"
              value={formData.username}
              onChangeText={(value) => updateField('username', value)}
              onBlur={() => setTouchedFields((prev) => new Set(prev).add('username'))}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {getFieldError('username') && (
              <Text style={styles.fieldError}>{getFieldError('username')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                getFieldError('email') && styles.inputError,
                touchedFields.has('email') && !getFieldError('email') && formData.email && styles.inputSuccess,
              ]}
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => updateField('email', value)}
              onBlur={() => setTouchedFields((prev) => new Set(prev).add('email'))}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {getFieldError('email') && (
              <Text style={styles.fieldError}>{getFieldError('email')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  getFieldError('password') && styles.inputError,
                  touchedFields.has('password') && !getFieldError('password') && formData.password && styles.inputSuccess,
                ]}
                placeholder="Enter password (min. 6 characters)"
                value={formData.password}
                onChangeText={(value) => updateField('password', value)}
                onBlur={() => setTouchedFields((prev) => new Set(prev).add('password'))}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {getFieldError('password') && (
              <Text style={styles.fieldError}>{getFieldError('password')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Confirm Password <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  getFieldError('confirmPassword') && styles.inputError,
                  touchedFields.has('confirmPassword') && !getFieldError('confirmPassword') && formData.confirmPassword && styles.inputSuccess,
                ]}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(value) => updateField('confirmPassword', value)}
                onBlur={() => setTouchedFields((prev) => new Set(prev).add('confirmPassword'))}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            {getFieldError('confirmPassword') && (
              <Text style={styles.fieldError}>{getFieldError('confirmPassword')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Phone Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                getFieldError('phone') && styles.inputError,
                touchedFields.has('phone') && !getFieldError('phone') && formData.phone && styles.inputSuccess,
              ]}
              placeholder="+233 XX XXX XXXX"
              value={formData.phone}
              onChangeText={(value) => updateField('phone', value)}
              onBlur={() => setTouchedFields((prev) => new Set(prev).add('phone'))}
              keyboardType="phone-pad"
            />
            {getFieldError('phone') && (
              <Text style={styles.fieldError}>{getFieldError('phone')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Emergency Contact <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                getFieldError('emergency_contact') && styles.inputError,
                touchedFields.has('emergency_contact') && !getFieldError('emergency_contact') && formData.emergency_contact && styles.inputSuccess,
              ]}
              placeholder="Emergency contact number"
              value={formData.emergency_contact}
              onChangeText={(value) => updateField('emergency_contact', value)}
              onBlur={() => setTouchedFields((prev) => new Set(prev).add('emergency_contact'))}
              keyboardType="phone-pad"
            />
            {getFieldError('emergency_contact') && (
              <Text style={styles.fieldError}>{getFieldError('emergency_contact')}</Text>
            )}
          </View>

          {/* Vehicle Information Section */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
            Vehicle Information
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Vehicle Type <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.vehicle_type}
                onValueChange={(value) => updateField('vehicle_type', value)}
                style={styles.picker}
              >
                <Picker.Item label="Motorcycle" value="motorcycle" />
                <Picker.Item label="Bicycle" value="bicycle" />
                <Picker.Item label="Car" value="car" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              License Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                getFieldError('license_number') && styles.inputError,
                touchedFields.has('license_number') && !getFieldError('license_number') && formData.license_number && styles.inputSuccess,
              ]}
              placeholder="Enter your driver's license number"
              value={formData.license_number}
              onChangeText={(value) => updateField('license_number', value)}
              onBlur={() => setTouchedFields((prev) => new Set(prev).add('license_number'))}
              autoCapitalize="characters"
            />
            {getFieldError('license_number') && (
              <Text style={styles.fieldError}>{getFieldError('license_number')}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Vehicle Registration Number <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                getFieldError('vehicle_number') && styles.inputError,
                touchedFields.has('vehicle_number') && !getFieldError('vehicle_number') && formData.vehicle_number && styles.inputSuccess,
              ]}
              placeholder="Enter vehicle registration number"
              value={formData.vehicle_number}
              onChangeText={(value) => updateField('vehicle_number', value)}
              onBlur={() => setTouchedFields((prev) => new Set(prev).add('vehicle_number'))}
              autoCapitalize="characters"
            />
            {getFieldError('vehicle_number') && (
              <Text style={styles.fieldError}>{getFieldError('vehicle_number')}</Text>
            )}
          </View>

          {/* Service Area Section */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
            Service Area
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Area Coverage <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                getFieldError('area_coverage') && styles.inputError,
                touchedFields.has('area_coverage') && !getFieldError('area_coverage') && formData.area_coverage && styles.inputSuccess,
              ]}
              placeholder="e.g., Accra, Tema, Adenta"
              value={formData.area_coverage}
              onChangeText={(value) => updateField('area_coverage', value)}
              onBlur={() => setTouchedFields((prev) => new Set(prev).add('area_coverage'))}
              multiline
              numberOfLines={3}
            />
            {getFieldError('area_coverage') && (
              <Text style={styles.fieldError}>{getFieldError('area_coverage')}</Text>
            )}
            <Text style={styles.hint}>
              Enter areas or regions where you can deliver
            </Text>
          </View>

          {/* Register Button */}
          <View style={styles.termsContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
              <Ionicons
                name={acceptedTerms ? 'checkbox' : 'square-outline'}
                size={24}
                color={acceptedTerms ? '#2563eb' : '#9ca3af'}
              />
            </TouchableOpacity>
            <Text style={styles.termsText}>
              I accept the{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Alert.alert('Terms & Conditions', 'Terms and conditions content will be displayed here.')}
              >
                Terms & Conditions
              </Text>
              {' '}and{' '}
              <Text
                style={styles.termsLink}
                onPress={() => Alert.alert('Privacy Policy', 'Privacy policy content will be displayed here.')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.registerButton, loading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.registerButtonText}>
              {loading ? 'Creating Account...' : 'Register as Rider'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 30,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#dbeafe',
  },
  errorContainer: {
    margin: 20,
    marginBottom: 0,
  },
  form: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 15,
  },
  sectionSpacing: {
    marginTop: 25,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeText: {
    fontSize: 20,
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  registerButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  disabledButton: {
    backgroundColor: '#93c5fd',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 10,
  },
  checkbox: {
    marginRight: 10,
    marginTop: 2,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  termsLink: {
    color: '#2563eb',
    fontWeight: '600',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  inputSuccess: {
    borderColor: '#10b981',
  },
});
