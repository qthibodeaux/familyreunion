import { Card, Image, Space } from 'antd-mobile';
import { DownOutline } from 'antd-mobile-icons';
import ancestors from '../assets/anc1.png';

function Hero() {
  return (
    <div className="hero-container">
      <Card className="hero-card">
        <h1 level={1} className="hero-title">
          Smith Family
        </h1>
        <Image src={ancestors} className="hero-image" fit="cover" />
        <Space>
          <DownOutline className="hero-icon" />
        </Space>
      </Card>
    </div>
  );
}

export default Hero;
