import { Card, Typography } from "antd";
import rootImage from "../../assets/root.png";
import "../../theme/components/Root.css";

const { Text } = Typography;

const RootCard = () => {
  return (
    <Card className="root-card-banner" style={{ backgroundImage: `url(${rootImage})` }}>
      <div className="root-card-overlay">
        <div className="root-card-content">
          <div className="founders-avatars">
            <div className="founder-avatar-wrapper unified">
              <img
                className="founder-avatar"
                src={rootImage}
                alt="John Henry & Birdie Mae"
              />
            </div>
          </div>

          <div className="founder-details-container">
            <div className="founder-details">
              <h3 className="founder-name">John Henry</h3>
              <span className="founder-dates">May 5, 1885 – Oct 24, 1959</span>
            </div>
            <div className="founder-heart">⚭</div>
            <div className="founder-details">
              <h3 className="founder-name">Birdie Mae</h3>
              <span className="founder-dates">Mar 9, 1909 – Mar 29, 1968</span>
            </div>
          </div>

          <div className="founder-message">
            <Text className="founder-message-text">
              Together, John Henry and Birdie Mae laid the foundation of a family tree rooted in love, resilience, and legacy that continues to grow with strength.
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RootCard;
