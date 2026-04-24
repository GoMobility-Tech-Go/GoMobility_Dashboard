import { Navigate } from "react-router-dom";
import ProtectedRoute from "../auth/ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import SignupPage from "../pages/auth/SignupPage";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import CityManagementPage from "../pages/city-management/CityManagementPage";
import PricingEnginePage from "../pages/pricing-engine/PricingEnginePage";
import DispatchSettingsPage from "../pages/dispatch-settings/DispatchSettingsPage";
import DriverOnboardingPage from "../pages/driver-onboarding/DriverOnboardingPage";
import RideMonitoringPage from "../pages/ride-monitoring/RideMonitoringPage";
import ComplaintsSupportPage from "../pages/complaints-support/ComplaintsSupportPage";
import DriverIncentivesPage from "../pages/driver-incentives/DriverIncentivesPage";
import OperationalMetricsPage from "../pages/operational-metrics/OperationalMetricsPage";
import SettingsPage from "../pages/settings/SettingsPage";
import FraudDetectionPage from "../pages/fraud-detection/FraudDetectionPage";
import UsersPage from "../pages/users/UsersPage";
import FinancePage from "../pages/finance/FinancePage";
import RefundsPage from "../pages/refunds/RefundsPage";
import PayoutsPage from "../pages/payouts/PayoutsPage";
import SubscriptionsPage from "../pages/subscriptions/SubscriptionsPage";
import ReviewsPage from "../pages/reviews/ReviewsPage";
import NotificationsPage from "../pages/notifications/NotificationsPage";
import PromoCodesPage from "../pages/promo-codes/PromoCodesPage";
import RolesAccessPage from "../pages/roles-access/RolesAccessPage";
import ActivityLogsPage from "../pages/activity-logs/ActivityLogsPage";
import RevenueAnalyticsPage from "../pages/revenue-analytics/RevenueAnalyticsPage";
import TaxReportsPage from "../pages/tax-reports/TaxReportsPage";
import BannersPage from "../pages/banners/BannersPage";
import EmergencySafetyPage from "../pages/emergency-safety/EmergencySafetyPage";
import AppConfigPage from "../pages/app-config/AppConfigPage";
import DriverTiersPage from "../pages/driver-tiers/DriverTiersPage";
import BroadcastMessagingPage from "../pages/broadcast-messaging/BroadcastMessagingPage";
import SystemHealthPage from "../pages/system-health/SystemHealthPage";
import CampaignsPage from "../pages/campaigns/CampaignsPage";
import UserSegmentsPage from "../pages/user-segments/UserSegmentsPage";

const routes = [
  { path:"/signup", element:<SignupPage/> },
  { path:"/login", element:<LoginPage/> },
  {
    element:<ProtectedRoute/>,
    children:[{
      path:"/", element:<MainLayout/>, children:[
        { index:true, element:<DashboardPage/> },
        { path:"users", element:<UsersPage/> },
        { path:"driver-onboarding", element:<DriverOnboardingPage/> },
        { path:"ride-monitoring", element:<RideMonitoringPage/> },
        { path:"finance", element:<FinancePage/> },
        { path:"refunds", element:<RefundsPage/> },
        { path:"payouts", element:<PayoutsPage/> },
        { path:"city-management", element:<CityManagementPage/> },
        { path:"pricing-engine", element:<PricingEnginePage/> },
        { path:"dispatch-settings", element:<DispatchSettingsPage/> },
        { path:"subscriptions", element:<SubscriptionsPage/> },
        { path:"driver-incentives", element:<DriverIncentivesPage/> },
        { path:"reviews", element:<ReviewsPage/> },
        { path:"complaints-support", element:<ComplaintsSupportPage/> },
        { path:"operational-metrics", element:<OperationalMetricsPage/> },
        { path:"notifications", element:<NotificationsPage/> },
        { path:"settings", element:<SettingsPage/> },
        { path:"fraud-detection", element:<FraudDetectionPage/> },
        { path:"promo-codes", element:<PromoCodesPage/> },
        { path:"roles-access", element:<RolesAccessPage/> },
        { path:"activity-logs", element:<ActivityLogsPage/> },
        { path:"revenue-analytics", element:<RevenueAnalyticsPage/> },
        { path:"tax-reports", element:<TaxReportsPage/> },
        { path:"banners", element:<BannersPage/> },
        { path:"emergency-safety", element:<EmergencySafetyPage/> },
        { path:"app-config", element:<AppConfigPage/> },
        { path:"driver-tiers", element:<DriverTiersPage/> },
        { path:"broadcast-messaging", element:<BroadcastMessagingPage/> },
        { path:"system-health", element:<SystemHealthPage/> },
        { path:"campaigns", element:<CampaignsPage/> },
        { path:"user-segments", element:<UserSegmentsPage/> },
      ]
    }]
  },
  { path:"*", element:<Navigate to="/login" replace/> },
];
export default routes;
