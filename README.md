# CircuitRunners Purchase Order Management System

A comprehensive web application for managing purchase orders, budgets, and transactions for CircuitRunners robotics organization. Built with modern web technologies and designed for production use.

## 🌟 Live Demo

**Production URL:** [https://dulcet-froyo-ec1a95.netlify.app](https://dulcet-froyo-ec1a95.netlify.app)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [User Roles & Permissions](#user-roles--permissions)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [System Architecture](#system-architecture)
- [Security](#security)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Support](#support)

## 🎯 Overview

The CircuitRunners PO System streamlines the purchase order workflow for robotics teams and sub-organizations. It provides role-based access control, budget tracking, transaction management, and comprehensive reporting capabilities.

### Key Benefits

- **Streamlined Workflow**: Automated approval process from creation to purchase
- **Budget Control**: Real-time budget tracking and alerts
- **Transparency**: Complete audit trail and status tracking
- **Efficiency**: Bulk transaction processing and automated calculations
- **Compliance**: Proper documentation and receipt management

## ✨ Features

### 🛒 Purchase Order Management
- **Create & Edit POs**: Rich line item management with vendor links
- **Approval Workflow**: Multi-stage approval process (Draft → Pending → Approved → Purchased)
- **Status Tracking**: Real-time status updates with notifications
- **Bulk Operations**: Export summaries and manage multiple POs
- **Smart Sorting**: Automatic vendor alphabetization for easy review

### 💰 Budget Management
- **Real-time Tracking**: Live budget utilization across 12 sub-organizations
- **Visual Indicators**: Progress bars and color-coded alerts
- **Over-budget Handling**: Justification requirements and approval workflows
- **Budget Alerts**: Automated notifications at 75%, 90%, and 100% thresholds
- **Recalculation Tools**: Automatic budget updates based on transactions

### 📊 Transaction Management
- **Excel Integration**: Bulk upload from bank/accounting systems
- **Receipt Management**: File upload and cloud storage
- **Allocation Tools**: Assign transactions to sub-organizations
- **Duplicate Prevention**: Automatic detection of existing transactions
- **Export Capabilities**: Generate reports in Excel format

### 🔔 Smart Notifications
- **Role-based Alerts**: Customized notifications per user type
- **Priority System**: High/medium/low priority classification
- **Action Links**: Direct navigation to relevant sections
- **Real-time Updates**: Live notification counts and status

### 📈 Dashboard & Analytics
- **Executive Overview**: Key metrics and budget summaries
- **Activity Feed**: Recent actions and status changes
- **Budget Visualization**: Progress tracking across organizations
- **Quick Actions**: One-click navigation to pending items

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Lucide React** - Beautiful icon library

### Backend & Database
- **Firebase Firestore** - NoSQL document database
- **Firebase Authentication** - Secure user management
- **Firebase Storage** - File storage for receipts
- **Firebase Security Rules** - Database-level security

### Additional Libraries
- **React Hook Form** - Form management
- **date-fns** - Date manipulation
- **XLSX** - Excel file processing
- **React Table** - Advanced table functionality

### Development Tools
- **ESLint** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## 👥 User Roles & Permissions

### 🎯 Director
- **Permissions**: Create POs, view own POs, receive status notifications
- **Use Cases**: Submit purchase requests for their sub-organization
- **Dashboard**: Personal PO tracking and budget visibility

### 🛡️ Admin
- **Permissions**: All director permissions + approve/decline POs, manage budgets, view all POs
- **Use Cases**: Review and approve purchase requests, manage organizational budgets
- **Dashboard**: Approval queue, budget alerts, system overview

### 🛒 Purchaser
- **Permissions**: All viewing permissions + mark POs as purchased, manage transactions
- **Use Cases**: Execute approved purchases, upload receipts, manage transaction records
- **Dashboard**: Purchase queue, transaction management, receipt tracking

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore, Authentication, and Storage enabled
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd circuitrunners-po-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your Firebase configuration
   # Get these values from your Firebase project settings
   ```

4. **Configure Firebase**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Firestore, Authentication, and Storage
   - Set up Firestore security rules from `firestore.rules`
   - Enable Email/Password authentication in Firebase Console
   - Copy your Firebase config values to the `.env` file

5. **Initialize Data**
   - The system will automatically create default sub-organizations on first run
   - Create user accounts through Firebase Console with appropriate roles

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Build for production**
   ```bash
   npm run build
   ```

### Environment Variables

Create a `.env` file in the root directory with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

**Important**: Never commit your `.env` file to version control. The `.env.example` file shows the required structure.

## 📖 Usage Guide

### For Directors

1. **Creating a Purchase Order**
   - Navigate to "Create PO"
   - Enter descriptive PO name and select sub-organization
   - Add line items with vendor, item details, quantities, and prices
   - Include product links for easy purchasing
   - Add special requests or justifications if over budget
   - Save as draft or submit for approval

2. **Managing Your POs**
   - View all your POs in "My POs"
   - Track status changes and admin feedback
   - Edit declined POs and resubmit
   - Download PO summaries for records

### For Admins

1. **Approving Purchase Orders**
   - Review pending POs in "Pending Approval"
   - Examine line items, budgets, and justifications
   - Add comments for approval or decline reasons
   - Monitor budget impact across organizations

2. **Budget Management**
   - Set and adjust budget allocations
   - Monitor spending across sub-organizations
   - Receive alerts for budget overruns
   - Generate budget reports

3. **Transaction Oversight**
   - Review uploaded transactions
   - Ensure proper allocation to sub-organizations
   - Manage receipt compliance

### For Purchasers

1. **Processing Purchases**
   - View approved POs in "Pending Purchase"
   - Use provided vendor links for purchasing
   - Check off items as purchased (updates status to "Pending Purchase")
   - Mark complete POs as "Purchased" with comments

2. **Transaction Management**
   - Upload bank/credit card statements (Excel format)
   - Allocate transactions to appropriate sub-organizations
   - Upload and manage receipts
   - Generate transaction reports

3. **Receipt Management**
   - Upload receipts for purchased items
   - Organize by transaction or PO
   - Maintain compliance documentation

## 🏗 System Architecture

### Database Structure

```
/users/{userId}
  - email, displayName, role, createdAt

/subOrganizations/{orgId}
  - name, budgetAllocated, budgetSpent

/purchaseOrders/{poId}
  - creatorId, subOrgId, status, lineItems[]
  - totalAmount, adminComments, purchaserComments
  - timestamps (created, updated, approved, purchased)

/transactions/{transactionId}
  - postDate, description, debitAmount
  - subOrgId, receiptUrl, notes
  - timestamps (created, updated)
```

### Security Model

- **Authentication**: Firebase Auth with email/password
- **Authorization**: Firestore security rules based on user roles
- **Data Validation**: Client and server-side validation
- **File Security**: Secure receipt storage with access controls

### Workflow States

```
Draft → Pending Approval → Approved → Pending Purchase → Purchased
  ↓           ↓              ↓
Delete    Declined      Delete (Admin)
  ↓           ↓
Delete    Edit & Resubmit
```

## 🔒 Security

### Authentication
- Email/password authentication via Firebase
- Domain restriction to @circuitrunners.com emails
- Secure session management

### Authorization
- Role-based access control (RBAC)
- Firestore security rules enforce permissions
- Client-side route protection

### Data Protection
- Encrypted data transmission (HTTPS)
- Secure file storage with access controls
- Input validation and sanitization
- Audit trail for all actions
- Environment variables for sensitive configuration

### Best Practices
- Principle of least privilege
- Regular security rule reviews
- Secure file upload handling
- XSS and injection prevention
- API keys secured via environment variables

## 🚀 Deployment

### Netlify Deployment (Current)
The application is deployed on Netlify with automatic builds from the main branch.

**Live URL**: https://dulcet-froyo-ec1a95.netlify.app

### Environment Variables for Deployment

For Netlify deployment, set the following environment variables in your Netlify dashboard:

```
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Manual Deployment Steps

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   - Connect your repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Configure environment variables in Netlify dashboard
   - Deploy automatically on push to main

### Alternative Deployment Platforms

The application can be deployed to any static hosting service:
- **Vercel**: Set environment variables in project settings
- **GitHub Pages**: Use GitHub Secrets for environment variables
- **AWS S3**: Configure environment variables in build process

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Add your Firebase configuration
   ```
4. **Make your changes**
5. **Test thoroughly**
6. **Submit a pull request**

### Code Standards
- TypeScript for type safety
- ESLint for code quality
- Consistent component structure
- Comprehensive error handling
- Responsive design principles
- Environment variable usage for configuration

### Testing Guidelines
- Test all user workflows
- Verify role-based permissions
- Check responsive design
- Validate data integrity
- Test file upload/download
- Verify environment variable handling

## 📞 Support

### Getting Help
- **Technical Issues**: Check browser console for errors
- **Access Problems**: Verify user role assignments in Firebase
- **Data Issues**: Check Firestore security rules and permissions
- **Configuration Issues**: Verify environment variables are set correctly

### Common Issues

1. **Login Problems**
   - Ensure email ends with @circuitrunners.com
   - Check Firebase Authentication settings
   - Verify user exists in Firestore users collection

2. **Permission Errors**
   - Confirm user role in Firestore
   - Check security rules are properly deployed
   - Verify user document structure

3. **Upload Issues**
   - Check file format (Excel for transactions, PDF/images for receipts)
   - Verify Firebase Storage rules
   - Ensure proper file size limits

4. **Configuration Errors**
   - Verify all environment variables are set
   - Check Firebase project settings match .env file
   - Ensure Firebase services are enabled

### System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript**: Must be enabled
- **Cookies**: Required for authentication
- **File Upload**: Modern browser with File API support

## 📊 System Metrics

### Performance
- **Load Time**: < 3 seconds on standard broadband
- **Bundle Size**: Optimized with code splitting
- **Responsive**: Mobile-first design approach
- **Accessibility**: WCAG 2.1 AA compliance

### Scalability
- **Users**: Supports 100+ concurrent users
- **Data**: Handles thousands of POs and transactions
- **Storage**: Unlimited receipt storage via Firebase
- **Bandwidth**: Optimized for efficient data transfer

## 🔄 Version History

### Current Version: 1.0.0
- Initial production release
- Complete PO workflow implementation
- Budget management system
- Transaction processing
- Role-based access control
- Comprehensive reporting
- Secure environment variable configuration

---

**Made with ❤️ by Samarth Mahapatra**

*For CircuitRunners Robotics Organization*