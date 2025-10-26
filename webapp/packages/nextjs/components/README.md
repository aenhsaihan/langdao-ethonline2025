# LangDAO Frontend Components

This directory contains the frontend components for the LangDAO language learning platform.

## 🚀 Features Implemented

### 1. Role Selection Page
- **Component**: `onboarding/RoleSelection.tsx`
- **Features**: 
  - Two-card interface for Student/Tutor selection
  - Responsive design with hover effects
  - Visual feedback on selection

### 2. Registration Forms

#### Student Registration
- **Component**: `onboarding/StudentRegistration.tsx`
- **Features**:
  - Target language dropdown with 10+ languages
  - Budget per hour input (PYUSD)
  - Integration with LangDAO contract `registerStudent` function
  - Transaction status handling

#### Tutor Registration
- **Component**: `onboarding/TutorRegistration.tsx`
- **Features**:
  - Multi-select language interface
  - Rate per hour input (PYUSD)
  - Integration with LangDAO contract `registerTutor` function
  - Visual language selection feedback

### 3. Deposit Flow
- **Components**: `deposit/DepositFlow.tsx`, `deposit/DepositSlider.tsx`
- **Features**:
  - Three-step process: Initial → Approval → Deposit
  - Interactive slider for amount selection
  - Quick percentage buttons (25%, 50%, 75%, 100%)
  - Manual amount input
  - PYUSD balance display
  - ERC-20 approval flow
  - Integration with LangDAO contract `depositFunds` function

### 4. Onboarding Orchestration
- **Component**: `onboarding/OnboardingFlow.tsx`
- **Features**:
  - Progress bar with step indicators
  - State management for multi-step flow
  - Role-based flow (students go through deposit, tutors skip it)
  - Back navigation support

## 🛠 Technical Implementation

### Dependencies Used
- **thirdweb**: Wallet connection and contract interactions
- **wagmi**: React hooks for Ethereum
- **viem**: Ethereum utilities
- **react-hot-toast**: User notifications
- **tailwindcss**: Styling
- **daisyui**: UI components

### Contract Integration
- **PYUSD Token**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- **LangDAO Contract**: Configurable in `lib/constants/contracts.ts`

### Key Features
- **Responsive Design**: Works on mobile and desktop
- **Dark Mode Support**: Full dark/light theme compatibility
- **Transaction Handling**: Loading states, error handling, success feedback
- **Type Safety**: Full TypeScript implementation
- **Accessibility**: Proper ARIA labels and keyboard navigation

## 📁 File Structure

```
components/
├── onboarding/
│   ├── RoleSelection.tsx       # Choose Student/Tutor
│   ├── StudentRegistration.tsx # Student form + contract call
│   ├── TutorRegistration.tsx   # Tutor form + contract call
│   ├── OnboardingFlow.tsx      # Main orchestrator
│   └── index.ts               # Exports
├── deposit/
│   ├── DepositFlow.tsx        # Main deposit component
│   ├── DepositSlider.tsx      # Amount selection slider
│   └── index.ts              # Exports
└── README.md                 # This file
```

## 🔧 Configuration

### Contract Addresses
Update `lib/constants/contracts.ts` with your deployed contract addresses:

```typescript
export const CONTRACTS = {
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
  LANGDAO: "0x4Fb5675e6baE48C95c1D4f1b154E3d5e8E36112C",
} as const;
```

### Language Support
Currently supports 10 languages. Add more in `lib/constants/contracts.ts`:

```typescript
export const LANGUAGES = [
  { id: 11, name: "Hindi", flag: "🇮🇳", code: "hi" },
  // Add more languages...
] as const;
```

## 🚀 Usage

### Basic Implementation
```tsx
import { OnboardingFlow } from "./components/onboarding";

function App() {
  const handleComplete = () => {
    // Redirect to main app
    router.push("/dashboard");
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
```

### Individual Components
```tsx
import { RoleSelection, StudentRegistration } from "./components/onboarding";
import { DepositFlow } from "./components/deposit";

// Use components individually for custom flows
```

## 🎨 Styling

The components use Tailwind CSS with:
- **Color Scheme**: Blue for students, Purple for tutors, Green for deposits
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Mobile-first design
- **Dark Mode**: Full support with `dark:` prefixes

## 🔐 Security Considerations

- **Input Validation**: All form inputs are validated
- **Transaction Safety**: Proper error handling and user confirmation
- **Rate Limiting**: Built-in loading states prevent double-submissions
- **Type Safety**: Full TypeScript coverage

## 📱 Mobile Responsiveness

All components are fully responsive:
- **Breakpoints**: `sm:`, `md:`, `lg:` for different screen sizes
- **Touch Friendly**: Large tap targets and proper spacing
- **Orientation**: Works in both portrait and landscape

## 🧪 Testing

To test the components:
1. Deploy your LangDAO contract
2. Update contract address in `lib/constants/contracts.ts`
3. Connect wallet with PYUSD balance
4. Navigate to `/onboarding`

## 🔄 Future Enhancements

Potential improvements:
- **Multi-language UI**: i18n support
- **Advanced Validation**: Real-time form validation
- **Progress Persistence**: Save progress in localStorage
- **Social Login**: Web3 social authentication
- **Enhanced UX**: More animations and micro-interactions