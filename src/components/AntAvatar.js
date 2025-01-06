import { useState, useCallback } from 'react';
import { Button, Card, Col, message, Row, Upload } from 'antd';
import { LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { supabase } from '../supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import getCroppedImage from '../components/utils/cropImage';

const getBase64 = (img, callback) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => callback(reader.result));
  reader.readAsDataURL(img);
};

const beforeUpload = (file) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) {
    message.error('You can only upload JPG/PNG files!');
  }
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    message.error('Image must be smaller than 2MB!');
  }
  return isJpgOrPng && isLt2M;
};

function AntAvatar() {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [file, setFile] = useState(null);
  const navigate = useNavigate();
  const { userid } = useParams();

  const handleChange = (info) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      getBase64(info.file.originFileObj, (url) => {
        setLoading(false);
        setImageUrl(url);
        setFile(info.file.originFileObj);
      });
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = async () => {
    try {
      const croppedImage = await getCroppedImage(imageUrl, croppedAreaPixels);
      setCroppedImageUrl(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSupabaseUpload = async () => {
    if (!croppedImageUrl) {
      message.error('Please crop the image first.');
      return;
    }

    setLoading(true);

    let fileName = `${userid}.jpg`; // Assuming the cropped image is always a JPEG
    let retries = 0;

    while (true) {
      try {
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, croppedImageUrl);

        if (uploadError) {
          throw uploadError;
        }

        const { error: updateError } = await supabase
          .from('profile')
          .update({ avatar_url: fileName })
          .eq('id', userid);

        if (updateError) {
          throw updateError;
        }

        message.success('Image uploaded successfully!');
        setLoading(false);
        navigate(`/profile/${userid}`);
        return;
      } catch (err) {
        if (err.statusCode === '409' && err.error === 'Duplicate') {
          retries++;
          fileName = `${userid}_${retries}.jpg`;
          continue; // Retry with new file name
        }

        console.error('Supabase upload error:', err);
        message.error('Upload failed. Please try again.');
        setLoading(false);
        return;
      }
    }
  };

  const uploadButton = (
    <div>
      {loading ? (
        <LoadingOutlined />
      ) : (
        <PlusOutlined style={{ color: '#F7DC92', fontWeight: 'bold' }} />
      )}
      <div style={{ marginTop: 8, color: '#F7DC92', fontWeight: 'bold' }}>
        Upload
      </div>
    </div>
  );

  const goToHome = () => {
    navigate('/');
  };

  return (
    <Row
      justify="center"
      align="start"
      style={{ padding: '1rem', height: '100%' }}
    >
      <Col>
        <Card
          style={{
            padding: '24px',
            backgroundColor: '#5b1f40',
            border: 'none',
          }}
        >
          <Row justify="center" style={{ padding: '1rem' }}>
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={beforeUpload}
              onChange={handleChange}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="avatar" style={{ width: '100%' }} />
              ) : (
                uploadButton
              )}
            </Upload>
          </Row>
          {imageUrl && !croppedImageUrl && (
            <Row justify="center" style={{ padding: '1rem' }}>
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
              <Button
                onClick={handleCrop}
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                Crop
              </Button>
            </Row>
          )}
          <Row justify="center" style={{ padding: '1rem' }}>
            {croppedImageUrl && (
              <Button
                onClick={handleSupabaseUpload}
                style={{
                  color: '#873D62',
                  background: '#F7DC92',
                  border: 'solid #EABEA9',
                  fontWeight: 'bold',
                }}
              >
                Upload
              </Button>
            )}
          </Row>
          <Row justify="center" style={{ paddingTop: '3rem' }}>
            <Button
              style={{
                background: 'none',
                border: 'solid #EABEA9',
                color: '#F7DC92',
                fontWeight: 'bold',
              }}
              onClick={goToHome}
            >
              Back
            </Button>
          </Row>
        </Card>
      </Col>
    </Row>
  );
}

export default AntAvatar;
