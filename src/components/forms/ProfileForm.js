import { useState } from 'react';
import { Col, Card, Row, Typography } from 'antd';
import {
  FirstNameForm,
  LastNameForm,
  NameForm,
  NickNameForm,
  SmithSideForm,
  SunriseForm,
  SunsetForm,
} from './index';
import { ConfirmCard } from '../../components/partial/index';
import { useParams } from 'react-router-dom';
import useParentDirector from '../director/useParentDirector';
import moment from 'moment';
const { Title } = Typography;

function ProfileForm() {
  useParentDirector();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickName, setNickName] = useState('');
  const [sunrise, setSunrise] = useState(null);
  const [sunset, setSunset] = useState(null);
  const [smithside, setSmithside] = useState(false);

  const { type, userid } = useParams();

  const [activeTab, setActiveTab] = useState('NameForm');

  const MainPage = ({ activeTab }) => {
    let comp = (
      <h1
        style={{
          backgroundColor: 'red',
          padding: '20px',
          fontWeight: 600,
          color: '#fff',
        }}
      >
        Developer Error: invalid tabId!
      </h1>
    );
    if (activeTab === 'NameForm')
      comp = (
        <NameForm
          setActiveTab={setActiveTab}
          setFirstName={setFirstName}
          setNickName={setNickName}
          type={type}
          userid={userid}
        />
      );
    else if (activeTab === 'SmithSideForm')
      comp = (
        <SmithSideForm
          setSmithside={setSmithside}
          setActiveTab={setActiveTab}
        />
      );
    else if (activeTab === 'FirstNameForm')
      comp = (
        <FirstNameForm
          setNickName={setNickName}
          setActiveTab={setActiveTab}
          setFirstName={setFirstName}
          type={type}
        />
      );
    else if (activeTab === 'LastNameForm')
      comp = (
        <LastNameForm
          setLastName={setLastName}
          setActiveTab={setActiveTab}
          setFirstName={setFirstName}
          setNickName={setNickName}
          type={type}
        />
      );
    else if (activeTab === 'NickNameForm')
      comp = (
        <NickNameForm
          setActiveTab={setActiveTab}
          setFirstName={setFirstName}
          setNickName={setNickName}
          type={type}
        />
      );
    else if (activeTab === 'SunriseForm')
      comp = (
        <SunriseForm
          setActiveTab={setActiveTab}
          setSunrise={setSunrise}
          setLastName={setLastName}
          type={type}
        />
      );
    else if (activeTab === 'SunsetForm')
      comp = (
        <SunsetForm
          setActiveTab={setActiveTab}
          setSunset={setSunset}
          type={type}
        />
      );
    else if (activeTab === 'ConfirmCard')
      comp = (
        <ConfirmCard
          setActiveTab={setActiveTab}
          firstName={firstName}
          nickName={nickName}
          lastName={lastName}
          smithside={smithside}
          sunrise={sunrise}
          sunset={sunset}
          type={type}
          setSunrise={setSunrise}
          setSunset={setSunset}
        />
      );

    return <div>{comp}</div>;
  };

  return (
    <div>
      <FormInfoBox
        firstName={firstName}
        nickName={nickName}
        lastName={lastName}
        sunrise={sunrise}
        sunset={sunset}
      />
      <MainPage activeTab={activeTab} />
    </div>
  );
}

const FormInfoBox = ({ firstName, lastName, nickName, sunrise, sunset }) => {
  let formattedDate = moment(sunrise).format('MMMM D, YYYY');
  let formattedSunset = sunset ? moment(sunset).format('MMMM D, YYYY') : null;

  return (
    <Row
      justify="center"
      style={{
        visibility: firstName || nickName ? 'visible' : 'hidden',
        paddingTop: '1rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
      }}
    >
      <Col span={24}>
        <Card
          style={{
            background: '#5b1f40',
            border: 'none',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <Row justify="center" align="middle" style={{ gap: '.5rem' }}>
            <Col>
              <Title level={3} style={{ color: '#f3e7b1' }}>
                {firstName}
              </Title>
            </Col>
            {nickName && (
              <Col>
                <Title level={3} style={{ color: '#f3e7b1' }}>
                  {nickName}
                </Title>
              </Col>
            )}
            <Col>
              <Title level={3} style={{ color: '#f3e7b1' }}>
                {lastName}
              </Title>
            </Col>
          </Row>
          {sunrise && (
            <Row justify="center" align="middle" gutter={16}>
              <Col>
                <Title level={3} style={{ color: '#f3e7b1' }}>
                  Sunrise:
                </Title>
              </Col>
              <Col>
                <Title level={3} style={{ color: '#fff' }}>
                  {formattedDate}
                </Title>
              </Col>
            </Row>
          )}
          {sunset && (
            <Row justify="center" align="middle" gutter={16}>
              <Col>
                <Title level={3} style={{ color: '#f3e7b1' }}>
                  Sunset:
                </Title>
              </Col>
              <Col>
                <Title level={3} style={{ color: '#fff' }}>
                  {formattedSunset}
                </Title>
              </Col>
            </Row>
          )}
        </Card>
      </Col>
    </Row>
  );
};

export default ProfileForm;
