import { useParams } from "react-router-dom";
import DashboardView from "../components/dashboard/DashboardView";

const Dashboard = () => {
  const { userId } = useParams<{ userId: string }>();

  return <DashboardView userId={userId} />;
};


export default Dashboard;
