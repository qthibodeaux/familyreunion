import { useState, useCallback } from "react";
import { Button, Card, Col, message, Row, Upload, Modal, Slider } from "antd";
import { LoadingOutlined, PlusOutlined } from "@ant-design/icons";
import { supabase } from "../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import Cropper from "react-easy-crop";
import getCroppedImage from "../components/utils/cropImage";

const getBase64 = (img, callback) => {
  const reader = new FileReader();
  reader.addEventListener("load", () => callback(reader.result));
  reader.readAsDataURL(img);
};

function AntAvatar() {
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const navigate = useNavigate();
  const { userid } = useParams();

  // 1. Intercept file select locally and open crop modal
  const beforeUpload = (file) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("You can only upload JPG/PNG files!");
      return Upload.LIST_IGNORE;
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error("Image must be smaller than 2MB!");
      return Upload.LIST_IGNORE;
    }

    getBase64(file, (url) => {
      setImageUrl(url);
      setIsModalOpen(true); // Open Modal
    });

    return false; // Prevent automatic server upload
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 2. Crop the image and upload directly in one action
  const handleCropConfirm = async () => {
    if (!croppedAreaPixels) return;

    setLoading(true);
    try {
      const croppedImage = await getCroppedImage(imageUrl, croppedAreaPixels);
      const fileName = `${userid}.jpg`;

      // Upload to Supabase avatars storage bucket
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedImage, {
          upsert: true, // Overwrites old avatar to keep storage clean
        });

      if (uploadError) throw uploadError;

      // Force browser cache update by appending a query timestamp
      const cacheBustName = `${fileName}?t=${new Date().getTime()}`;

      // Update user's avatar_url in profiles table
      const { error: updateError } = await supabase
        .from("profile")
        .update({ avatar_url: cacheBustName })
        .eq("id", userid);

      if (updateError) throw updateError;

      message.success("Profile picture updated!");
      setIsModalOpen(false);
      navigate(`/profile/${userid}`);
    } catch (err) {
      console.error(err);
      message.error("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setImageUrl(null);
  };

  const uploadButton = (
    <div>
      {loading ? (
        <LoadingOutlined />
      ) : (
        <PlusOutlined style={{ color: "#F7DC92", fontWeight: "bold" }} />
      )}
      <div style={{ marginTop: 8, color: "#F7DC92", fontWeight: "bold" }}>
        Upload Photo
      </div>
    </div>
  );

  const goToHome = () => {
    navigate("/");
  };

  return (
    <Row
      justify="center"
      align="start"
      style={{ padding: "1rem", height: "100%", paddingTop: "5rem" }}
    >
      <Col xs={24} sm={16} md={12} lg={8}>
        <Card
          style={{
            padding: "24px",
            backgroundColor: "#5b1f40",
            border: "none",
            borderRadius: "8px",
          }}
        >
          <Row justify="center" style={{ padding: "1rem" }}>
            <Upload
              name="avatar"
              listType="picture-card"
              className="avatar-uploader"
              showUploadList={false}
              beforeUpload={beforeUpload}
            >
              {uploadButton}
            </Upload>
          </Row>

          <Row justify="center" style={{ paddingTop: "2rem" }}>
            <Button
              style={{
                background: "none",
                border: "solid #EABEA9",
                color: "#F7DC92",
                fontWeight: "bold",
              }}
              onClick={goToHome}
            >
              Back
            </Button>
          </Row>
        </Card>
      </Col>

      {/* Cropping Modal */}
      <Modal
        title="Crop Profile Picture"
        open={isModalOpen}
        onOk={handleCropConfirm}
        onCancel={handleCancel}
        okText="Save & Upload"
        cancelText="Cancel"
        confirmLoading={loading}
        okButtonProps={{
          style: {
            backgroundColor: "#F7DC92",
            color: "#873D62",
            fontWeight: "bold",
          },
        }}
      >
        {/* Relative container wrapper to fix Layout styling bug */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "300px",
            background: "#333",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div style={{ marginTop: "16px" }}>
          <span style={{ fontWeight: "bold" }}>Zoom:</span>
          <Slider
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(val) => setZoom(val)}
          />
        </div>
      </Modal>
    </Row>
  );
}

export default AntAvatar;
