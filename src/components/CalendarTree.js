import React, { useState, useEffect, useRef } from "react";
import { Typography } from "antd";
import { 
  RightOutlined, 
  UserOutlined,
  CalendarOutlined
} from "@ant-design/icons";
import { supabase } from "../supabaseClient";
import "./CalendarTree.css";

import { getAvatarSrc } from "../utils/avatarHelper";

const { Title, Text } = Typography;

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const CalendarTree = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  const monthStripRef = useRef(null);

  useEffect(() => {
    fetchFamilyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll the active month into view on the mobile strip without shifting the parent layout wrapper
  useEffect(() => {
    if (monthStripRef.current) {
      const activeItem = monthStripRef.current.querySelector('.active');
      const container = monthStripRef.current.parentElement;
      if (activeItem && container) {
        const containerRect = container.getBoundingClientRect();
        const activeRect = activeItem.getBoundingClientRect();
        const scrollLeft = container.scrollLeft + (activeRect.left - containerRect.left) - (containerRect.width / 2) + (activeRect.width / 2);
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [currentMonth]);

  const fetchFamilyData = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profile")
      .select("*")
      .not("sunrise", "is", null);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const grouped = profiles.reduce((acc, person) => {
      const birthDate = new Date(person.sunrise);
      const m = birthDate.getMonth() + 1;
      const d = birthDate.getDate();
      
      if (!acc[m]) acc[m] = { days: {}, people: [] };
      if (!acc[m].days[d]) acc[m].days[d] = [];
      
      acc[m].days[d].push({
        ...person,
        day: d,
        month: m,
        isAncestor: !!person.sunset,
        age: calculateAge(person.sunrise, person.sunset)
      });
      acc[m].people.push(person);
      return acc;
    }, {});

    setData(grouped);
    setLoading(false);
  };

  const calculateAge = (sunrise, sunset) => {
    const birth = new Date(sunrise);
    const end = sunset ? new Date(sunset) : new Date();
    let age = end.getFullYear() - birth.getFullYear();
    const m = end.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
    return age;
  };


  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };

  const MobileCard = ({ day, people }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const count = people.length;
    const topPerson = people[0];

    return (
      <div className={`mobile-stack-card ${isExpanded ? 'is-expanded' : ''}`}>
        <div 
          className="card-main-row" 
          onClick={() => count > 1 ? setIsExpanded(!isExpanded) : null}
        >
          <div className="card-date-side">
            <div className="date-number-group">
              <span className="date-number">{day}</span>
              <span className="date-suffix">{getOrdinal(day)}</span>
            </div>
          </div>
          
          <div className="card-visual-stack">
            {people.slice(0, 3).map((p, i) => (
              <div 
                key={p.id} 
                className={`stack-avatar-wrapper layer-${i} ${p.isAncestor ? 'ancestor-frame' : 'living-frame'}`}
                style={{ zIndex: 10 - i }}
              >
                <div className="stacked-image-container">
                  {p.avatar_url ? (
                    <img 
                      src={getAvatarSrc(p)} 
                      alt={p.firstname}
                      className="stacked-image"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <UserOutlined style={{ fontSize: '20px', color: 'rgba(234,190,169,0.5)' }} />
                  )}
                </div>
                {p.isAncestor && i === 0 && <div className="legacy-ribbon">Legacy</div>}
              </div>
            ))}
            {count > 3 && <div className="stack-more-indicator">+{count - 3}</div>}
          </div>

          <div className="card-info">
            <Title level={5} className="primary-name">
              {topPerson.firstname} {count > 1 && !isExpanded && `& ${count - 1} others`}
            </Title>
            <Text type="secondary" className="age-text">
              {topPerson.isAncestor ? `Lived to ${topPerson.age}` : `${topPerson.age} years old`}
            </Text>
          </div>
          {count > 1 && (
            <div className={`expand-arrow ${isExpanded ? 'up' : 'down'}`}>
              <RightOutlined />
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="card-expanded-content">
            {people.map((p, idx) => (
              <div key={p.id} className="expanded-person-item">
                <div className="mini-avatar-box">
                  {p.avatar_url ? (
                    <img src={getAvatarSrc(p)} alt={p.firstname} />
                  ) : (
                    <UserOutlined />
                  )}
                </div>
                <div className="mini-info">
                  <Text strong>{p.firstname} {p.lastname}</Text>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                    {p.isAncestor ? `Lived to ${p.age}` : `${p.age} years old`}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="loading-container">Loading...</div>;

  const currentMonthData = data[currentMonth] || { days: {}, people: [] };
  const sortedDays = Object.keys(currentMonthData.days).sort((a, b) => a - b);

  return (
    <div className="mobile-calendar-container">
      <header className="mobile-calendar-header" style={{ justifyContent: "center" }}>
        <div className="header-title" style={{ textAlign: "center" }}>
          <Title level={3} style={{ margin: 0, color: "#5b1f40" }}>Family Birthdays</Title>
          <Text className="total-count">{currentMonthData.people.length} Birthdays in {months[currentMonth - 1]}</Text>
        </div>
      </header>

      <div className="month-scroll-bar">
        <div className="month-wheel" ref={monthStripRef}>
          {months.map((m, idx) => (
            <div 
              key={m} 
              className={`wheel-month-item ${currentMonth === idx + 1 ? 'active' : ''}`}
              onClick={() => setCurrentMonth(idx + 1)}
            >
              {m.substring(0, 3)}
            </div>
          ))}
        </div>
      </div>

      <div className="scroll-content">
        {sortedDays.map(day => (
          <MobileCard key={day} day={day} people={currentMonthData.days[day]} />
        ))}
        {sortedDays.length === 0 && (
          <div className="empty-state">
            <CalendarOutlined style={{ fontSize: 48, color: '#ddd', marginBottom: 16 }} />
            <Text type="secondary">No birthdays recorded for {months[currentMonth - 1]}</Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarTree;
