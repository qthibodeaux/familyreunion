import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import { supabase } from "../../supabaseClient";
import AuthConsumer from "../../useSession";
import { format, getDaysInMonth, isAfter, isBefore } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { AnimatePresence, motion } from "framer-motion";
import useParentDirector from "../director/useParentDirector";
import "./ProfileWizard.css";

// Helper components for Custom Date Picker Scroll Tab
const DrumRollColumn = ({ options, value, onChange, label }) => {
  const containerRef = useRef(null);
  const isProgrammaticScroll = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const index = options.indexOf(value);
    if (index !== -1) {
      const targetScrollTop = index * 36;
      if (Math.abs(container.scrollTop - targetScrollTop) > 2) {
        isProgrammaticScroll.current = true;
        container.scrollTop = targetScrollTop;
      }
    }
  }, [value, options]);

  const handleScroll = (e) => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    const container = e.target;
    const index = Math.round(container.scrollTop / 36);
    if (index >= 0 && index < options.length) {
      const newValue = options[index];
      if (newValue !== value) {
        onChange(newValue);
      }
    }
  };

  return (
    <div
      className={`drum-roll-column ${label}-col`}
      ref={containerRef}
      onScroll={handleScroll}
    >
      {options.map((opt) => (
        <div
          key={opt}
          className={`drum-roll-item ${opt === value ? "selected" : ""}`}
          style={{ height: 36 }}
        >
          {label === "month" ? format(new Date(2000, opt - 1, 1), "MMM") : opt}
        </div>
      ))}
    </div>
  );
};

function ProfileWizard() {
  useParentDirector();
  const navigate = useNavigate();
  const { type, userid } = useParams();
  const { session } = AuthConsumer();
  const userId = session?.user?.id;
  const anchorId = userid || userId;

  // Step routing history stack
  const [history, setHistory] = useState(["NameForm"]);
  const currentStep = history[history.length - 1];
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Live input values
  const [firstName, setFirstName] = useState("");
  const [nickName, setNickName] = useState("");
  const [lastName, setLastName] = useState("");
  const [sunrise, setSunrise] = useState(""); // YYYY-MM-DD
  const [sunset, setSunset] = useState("");   // YYYY-MM-DD
  const [hasGoneHome, setHasGoneHome] = useState(null); // true/false

  // Confirmed values (updates on confirmation to prevent card jitter)
  const [confirmedFirstName, setConfirmedFirstName] = useState("");
  const [confirmedNickName, setConfirmedNickName] = useState("");
  const [confirmedLastName, setConfirmedLastName] = useState("");
  const [confirmedSunrise, setConfirmedSunrise] = useState("");
  const [confirmedSunset, setConfirmedSunset] = useState("");

  // Validation feedback
  const [validationError, setValidationError] = useState("");

  // Payoff animation states
  const [playingPayoff, setPlayingPayoff] = useState(false);
  const [loading, setLoading] = useState(false);

  // Viewport tracking for mobile keyboard
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  // Profile data of relative
  const [anchorProfile, setAnchorProfile] = useState(null);
  const [ancestor, setAncestor] = useState(null);

  // Date Picker internal values
  const [datePickerTab, setDatePickerTab] = useState("scroll");
  const [pickerMonth, setPickerMonth] = useState(6);
  const [pickerDay, setPickerDay] = useState(15);
  const [pickerYear, setPickerYear] = useState(1990);

  // Type tab strings
  const [tempMonthStr, setTempMonthStr] = useState("06");
  const [tempDayStr, setTempDayStr] = useState("15");
  const [tempYearStr, setTempYearStr] = useState("1990");
  const [focusedBox, setFocusedBox] = useState("month");
  const [boxNeedsClearing, setBoxNeedsClearing] = useState(false);

  // Calendar tab months
  const [calendarMonth, setCalendarMonth] = useState(6);
  const [calendarYear, setCalendarYear] = useState(1990);

  // Safeguard Regex Rules & Helpers
  const nameRegex = /^[a-zA-Z\s\-']{1,50}$/;
  const nicknameRegex = /^[a-zA-Z\s\-'"()]{1,50}$/;

  const formatName = (str) => {
    return str
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Detect keyboard state and height
  useEffect(() => {
    const handler = () => {
      const vHeight = window.visualViewport?.height ?? window.innerHeight;
      setViewportHeight(vHeight);
      const isKbd = vHeight < (window.screen.height || window.innerHeight) * 0.75;
      setKeyboardOpen(isKbd);
    };
    window.visualViewport?.addEventListener("resize", handler);
    handler();
    return () => window.visualViewport?.removeEventListener("resize", handler);
  }, []);

  // Fetch anchor profile & ancestor
  useEffect(() => {
    const fetchAnchorProfile = async () => {
      if (!anchorId) return;
      try {
        const { data, error } = await supabase
          .from("profile")
          .select(`
            id, firstname, lastname, branch, ancestor,
            ancestor_profile:ancestor (id, firstname, lastname)
          `)
          .eq("id", anchorId)
          .maybeSingle();

        if (!error && data) {
          setAnchorProfile(data);
          setAncestor(data.ancestor);
        }
      } catch (err) {
        console.error("Error fetching anchor profile:", err);
      }
    };
    fetchAnchorProfile();
  }, [anchorId]);

  // Sync date picker values & initialize defaults when entering steps
  useEffect(() => {
    if (currentStep === "SunriseForm") {
      const initialDate = sunrise ? new Date(sunrise) : new Date("1990-06-15");
      const m = initialDate.getMonth() + 1;
      const d = initialDate.getDate();
      const y = initialDate.getFullYear();
      setPickerMonth(m);
      setPickerDay(d);
      setPickerYear(y);
      setTempMonthStr(m.toString().padStart(2, "0"));
      setTempDayStr(d.toString().padStart(2, "0"));
      setTempYearStr(y.toString());
      setDatePickerTab("scroll");

      // Auto-set initial default if empty so click Submit proceeds immediately
      if (!sunrise) {
        setSunrise("1990-06-15");
        setConfirmedSunrise("1990-06-15");
      }
    } else if (currentStep === "SunsetForm") {
      const initialDate = sunset ? new Date(sunset) : new Date("2020-06-15");
      const m = initialDate.getMonth() + 1;
      const d = initialDate.getDate();
      const y = initialDate.getFullYear();
      setPickerMonth(m);
      setPickerDay(d);
      setPickerYear(y);
      setTempMonthStr(m.toString().padStart(2, "0"));
      setTempDayStr(d.toString().padStart(2, "0"));
      setTempYearStr(y.toString());
      setDatePickerTab("scroll");

      // Auto-set initial default if empty
      if (!sunset) {
        setSunset("2020-06-15");
        setConfirmedSunset("2020-06-15");
      }
    }
  }, [currentStep, sunrise, sunset]);

  // Ordinal generator helper
  const getOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Badge label formatting
  const getBadgeText = () => {
    if (type === "self") {
      if (anchorProfile?.branch === 0) return "ROOTS · FOUNDER";
      return anchorProfile?.branch !== undefined && anchorProfile?.branch !== null
        ? `${getOrdinal(anchorProfile.branch + 1)} GEN · ${anchorProfile.ancestor_profile
            ? `${anchorProfile.ancestor_profile.firstname} ${anchorProfile.ancestor_profile.lastname}`
            : "SMITH LINE"
          }`.toUpperCase()
        : "CREATING PROFILE";
    }

    if (!anchorProfile) return "CREATING PROFILE";
    const anchorName = `${anchorProfile.firstname} ${anchorProfile.lastname}`.toUpperCase();

    if (type === "child") {
      const childBranch = anchorProfile.branch !== null && anchorProfile.branch !== undefined ? anchorProfile.branch + 1 : 0;
      const genNum = childBranch + 1;
      return `${getOrdinal(genNum)} GEN · ${anchorProfile.ancestor_profile
          ? `${anchorProfile.ancestor_profile.firstname} ${anchorProfile.ancestor_profile.lastname}`
          : anchorName
        }`.toUpperCase();
    }

    if (type === "spouse") {
      return `SPOUSE · ${anchorName}`;
    }

    if (type === "parent" || type === "smithparent") {
      const parentBranch = anchorProfile.branch !== null && anchorProfile.branch !== undefined ? Math.max(0, anchorProfile.branch - 1) : 0;
      const genNum = parentBranch + 1;
      return `${getOrdinal(genNum)} GEN · ${anchorProfile.ancestor_profile
          ? `${anchorProfile.ancestor_profile.firstname} ${anchorProfile.ancestor_profile.lastname}`
          : "SMITH LINE"
        }`.toUpperCase();
    }

    return "FAMILY MEMBER";
  };

  const getDisplayNameForQuestion = () => firstName || nickName || "they";

  const getPossessiveName = (name) => {
    if (!name) return "their";
    if (name.toLowerCase() === "you") return "your";
    return name.endsWith("s") ? `${name}'` : `${name}'s`;
  };

  // History / Navigation Controls
  const goBack = () => {
    if (history.length > 1) {
      setDirection(-1);
      const prevHistory = history.slice(0, -1);
      setHistory(prevHistory);
      setValidationError("");
    } else {
      navigate(-1);
    }
  };

  const handleNext = (nextStep) => {
    setDirection(1);
    setConfirmedFirstName(firstName);
    setConfirmedNickName(nickName);
    setConfirmedLastName(lastName);
    setConfirmedSunrise(sunrise);
    setConfirmedSunset(sunset);
    setValidationError("");
    setHistory((prev) => [...prev, nextStep]);
  };

  const jumpToStep = (stepName) => {
    const allPossibleSteps = [
      "NameForm",
      "NickNameForm",
      "FirstNameForm",
      "LastNameForm",
      "SunriseForm",
      "LivingDeceasedForm",
      "SunsetForm",
      "ConfirmCard",
    ];
    const targetIdx = allPossibleSteps.indexOf(stepName);
    const currentIdx = allPossibleSteps.indexOf(currentStep);

    setDirection(targetIdx > currentIdx ? 1 : -1);
    setValidationError("");

    const stepIdxInHistory = history.indexOf(stepName);
    if (stepIdxInHistory !== -1) {
      setHistory(history.slice(0, stepIdxInHistory + 1));
    } else {
      setHistory((prev) => [...prev, stepName]);
    }
  };

  const jumpToFirstName = () => {
    if (history.includes("FirstNameForm")) {
      jumpToStep("FirstNameForm");
    } else {
      jumpToStep("NameForm");
    }
  };

  // Step submissions with strict empty and regex guards
  const submitNameAsFirstName = (val) => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      setValidationError("Please enter a first name");
      return;
    }
    if (!nameRegex.test(trimmed)) {
      setValidationError("First names can only contain letters, hyphens, and apostrophes");
      return;
    }
    const formatted = formatName(trimmed);
    setFirstName(formatted);
    setConfirmedFirstName(formatted);
    handleNext("NickNameForm");
  };

  const submitNameAsNickName = (val) => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      setValidationError("Please enter a family nickname");
      return;
    }
    if (!nicknameRegex.test(trimmed)) {
      setValidationError("Nicknames can only contain letters, hyphens, and quotes");
      return;
    }
    const formatted = formatName(trimmed);
    setNickName(formatted);
    setConfirmedNickName(formatted);
    handleNext("FirstNameForm");
  };

  const submitNickName = (val) => {
    const trimmed = (val || "").trim();
    if (trimmed && !nicknameRegex.test(trimmed)) {
      setValidationError("Nicknames can only contain letters, hyphens, and quotes");
      return;
    }
    const formatted = trimmed ? formatName(trimmed) : "";
    setNickName(formatted);
    setConfirmedNickName(formatted);
    handleNext("LastNameForm");
  };

  const skipNickName = () => {
    setNickName("");
    setConfirmedNickName("");
    handleNext("LastNameForm");
  };

  const submitFirstName = (val) => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      setValidationError("First name cannot be blank");
      return;
    }
    if (!nameRegex.test(trimmed)) {
      setValidationError("First names can only contain letters, hyphens, and apostrophes");
      return;
    }
    const formatted = formatName(trimmed);
    setFirstName(formatted);
    setConfirmedFirstName(formatted);
    handleNext("LastNameForm");
  };

  const submitLastName = (val) => {
    const trimmed = (val || "").trim();
    if (!trimmed) {
      setValidationError("Last name cannot be blank");
      return;
    }
    if (!nameRegex.test(trimmed)) {
      setValidationError("Last names can only contain letters, hyphens, and apostrophes");
      return;
    }
    const formatted = formatName(trimmed);
    setLastName(formatted);
    setConfirmedLastName(formatted);
    handleNext("SunriseForm");
  };

  const submitSmithSide = () => {
    handleNext("SunriseForm");
  };

  const submitSunrise = (dateStr) => {
    if (datePickerTab === "type") {
      const valid = commitTypedDate((formatted) => {
        setSunrise(formatted);
        setConfirmedSunrise(formatted);
        handleNextStepAfterSunrise(formatted);
      });
      if (!valid) return;
    } else {
      if (!sunrise) {
        setValidationError("Please select a valid date");
        return;
      }
      handleNextStepAfterSunrise(sunrise);
    }
  };

  const handleNextStepAfterSunrise = (val) => {
    if (type === "self") {
      const birthDate = new Date(val);
      const ageDiffMs = Date.now() - birthDate.getTime();
      const ageDate = new Date(ageDiffMs);
      const age = Math.abs(ageDate.getUTCFullYear() - 1970);
      if (age < 18) {
        setValidationError("You must be 18 or older to register on the family portal. Minor profiles can be created in the tree, but cannot claim accounts.");
        return;
      }
      handleNext("ConfirmCard");
    } else {
      handleNext("LivingDeceasedForm");
    }
  };

  const submitLivingStatus = (deceased) => {
    setHasGoneHome(deceased);
    setTimeout(() => {
      if (deceased) {
        handleNext("SunsetForm");
      } else {
        setSunset("");
        setConfirmedSunset("");
        handleNext("ConfirmCard");
      }
    }, 300);
  };

  const submitSunset = (dateStr) => {
    if (datePickerTab === "type") {
      const valid = commitTypedDate((formatted) => {
        setSunset(formatted);
        setConfirmedSunset(formatted);
        handleNextStepAfterSunset(formatted);
      });
      if (!valid) return;
    } else {
      if (!sunset) {
        setValidationError("Please select a valid date");
        return;
      }
      handleNextStepAfterSunset(sunset);
    }
  };

  const handleNextStepAfterSunset = (val) => {
    if (sunrise && isBefore(new Date(val), new Date(sunrise))) {
      setValidationError("Sunset date cannot be before sunrise date");
      return;
    }
    handleNext("ConfirmCard");
  };

  // Keyboard open pill confirmation
  const goNextFromPill = () => {
    if (currentStep === "NameForm") {
      submitNameAsFirstName(firstName);
    } else if (currentStep === "NickNameForm") {
      submitNickName(nickName);
    } else if (currentStep === "FirstNameForm") {
      submitFirstName(firstName);
    } else if (currentStep === "LastNameForm") {
      submitLastName(lastName);
    }
  };

  // Save details to database
  const handleSaveProfile = async () => {
    setLoading(true);
    setValidationError("");

    const profileId = type === "self" ? userId : uuidv4();

    let profileData = {
      id: profileId,
      firstname: firstName,
      nickname: nickName || null,
      lastname: lastName,
      sunrise,
      sunset: sunset || null,
    };

    if (ancestor && (type === "smithparent" || type === "child")) {
      profileData.ancestor = ancestor;
    }

    if (type === "child") {
      try {
        const { data: parentProfile, error: parentProfileError } = await supabase
          .from("profile")
          .select("branch, ancestor")
          .eq("id", anchorId)
          .single();

        if (parentProfileError) {
          message.error("Error fetching parent profile: " + parentProfileError.message);
          setLoading(false);
          return;
        }

        profileData.parent = anchorId;
        if (parentProfile.ancestor) {
          profileData.ancestor = parentProfile.ancestor;
        } else {
          profileData.ancestor = anchorId;
        }

        if (parentProfile.branch !== null) {
          profileData.branch = parentProfile.branch + 1;
        } else {
          profileData.branch = 0;
        }
      } catch (err) {
        console.error("Error loading parent details:", err);
      }
    }

    try {
      let profileError;
      if (type === "self") {
        ({ error: profileError } = await supabase
          .from("profile")
          .update(profileData)
          .eq("id", userId));
      } else {
        ({ error: profileError } = await supabase
          .from("profile")
          .insert([profileData]));
      }

      if (profileError) throw profileError;

      let connectionData;
      switch (type) {
        case "smithparent":
          connectionData = [
            { profile_1: profileId, profile_2: anchorId, connection_type: "child" },
            { profile_1: anchorId, profile_2: profileId, connection_type: "parent" },
          ];
          const { error: updateParentError } = await supabase
            .from("profile")
            .update({ parent: profileId })
            .eq("id", anchorId);
          if (updateParentError) throw updateParentError;
          break;

        case "spouse":
          connectionData = [
            { profile_1: anchorId, profile_2: profileId, connection_type: "spouse" },
            { profile_1: profileId, profile_2: anchorId, connection_type: "spouse" },
          ];
          break;

        case "parent":
          connectionData = [
            { profile_1: anchorId, profile_2: profileId, connection_type: "parent" },
            { profile_1: profileId, profile_2: anchorId, connection_type: "child" },
          ];
          break;

        case "child":
          connectionData = [
            { profile_1: anchorId, profile_2: profileId, connection_type: "child" },
            { profile_1: profileId, profile_2: anchorId, connection_type: "parent" },
          ];
          break;

        default:
          break;
      }

      if (connectionData) {
        let { error: connectionError } = await supabase
          .from("connection")
          .insert(connectionData);
        if (connectionError) throw connectionError;
      }

      // Done payoff animation
      setPlayingPayoff(true);

      setTimeout(() => {
        message.success("Profile saved successfully");
        setLoading(false);
        navigate(`/profile/${anchorId}`);
      }, 1200);

    } catch (error) {
      message.error("Error creating profile: " + error.message);
      setLoading(false);
    }
  };

  // Steps Progress dots list calculation
  const getStepsPath = () => {
    const path = ["NameForm"];
    if (history.includes("FirstNameForm")) {
      path.push("FirstNameForm");
    } else if (history.includes("NickNameForm")) {
      path.push("NickNameForm");
    } else {
      path.push("NickNameForm");
    }
    path.push("LastNameForm");
    path.push("SunriseForm");
    if (type !== "self") {
      path.push("LivingDeceasedForm");
      if (hasGoneHome) {
        path.push("SunsetForm");
      }
    }
    path.push("ConfirmCard");
    return path;
  };

  // Custom Date Picker MM / DD / YYYY typing tab commit with Future Date validation
  const commitTypedDate = (onDateChange) => {
    const m = parseInt(tempMonthStr, 10);
    const d = parseInt(tempDayStr, 10);
    const y = parseInt(tempYearStr, 10);
    const currentYear = new Date().getFullYear();

    if (isNaN(m) || m < 1 || m > 12) {
      setValidationError("Please enter a valid month (01-12)");
      return false;
    }

    const maxDays = getDaysInMonth(new Date(y || 2000, m - 1, 1));
    if (isNaN(d) || d < 1 || d > maxDays) {
      setValidationError(`Please enter a valid day for this month (01-${maxDays})`);
      return false;
    }

    if (isNaN(y) || y < 1800 || y > currentYear) {
      setValidationError(`Please enter a valid year (1800-${currentYear})`);
      return false;
    }

    // Check future bounds (entire date is in the future)
    const targetDate = new Date(y, m - 1, d);
    if (isAfter(targetDate, new Date())) {
      setValidationError("Future dates are not allowed");
      return false;
    }

    setPickerMonth(m);
    setPickerDay(d);
    setPickerYear(y);
    setValidationError("");

    const formatted = `${y}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
    onDateChange(formatted);
    return true;
  };

  // Select virtual input box
  const selectBox = (box) => {
    setFocusedBox(box);
    setBoxNeedsClearing(true);
  };

  // Numpad key triggers with overwrite support
  const handleNumPadPress = (num) => {
    setValidationError("");
    let isClearing = boxNeedsClearing;
    if (isClearing) {
      setBoxNeedsClearing(false);
    }

    if (focusedBox === "month") {
      const currentVal = isClearing ? "" : tempMonthStr;
      if (currentVal.length === 0) {
        if (num === "0" || num === "1") {
          setTempMonthStr(num);
        } else {
          setTempMonthStr("0" + num);
          setFocusedBox("day");
          setBoxNeedsClearing(true);
        }
      } else if (currentVal.length === 1) {
        const nextVal = currentVal + num;
        if (parseInt(nextVal, 10) <= 12) {
          setTempMonthStr(nextVal);
          setFocusedBox("day");
          setBoxNeedsClearing(true);
        }
      }
    } else if (focusedBox === "day") {
      const currentVal = isClearing ? "" : tempDayStr;
      if (currentVal.length === 0) {
        if (num === "0" || num === "1" || num === "2" || num === "3") {
          setTempDayStr(num);
        } else {
          setTempDayStr("0" + num);
          setFocusedBox("year");
          setBoxNeedsClearing(true);
        }
      } else if (currentVal.length === 1) {
        const nextVal = currentVal + num;
        if (parseInt(nextVal, 10) <= 31) {
          setTempDayStr(nextVal);
          setFocusedBox("year");
          setBoxNeedsClearing(true);
        }
      }
    } else if (focusedBox === "year") {
      const currentVal = isClearing ? "" : tempYearStr;
      if (currentVal.length < 4) {
        setTempYearStr(currentVal + num);
      }
    }
  };

  const handleNumPadBackspace = () => {
    setValidationError("");
    if (focusedBox === "month") {
      if (tempMonthStr.length > 0) {
        setTempMonthStr((prev) => prev.slice(0, -1));
      }
    } else if (focusedBox === "day") {
      if (tempDayStr.length > 0) {
        setTempDayStr((prev) => prev.slice(0, -1));
      } else {
        setFocusedBox("month");
      }
    } else if (focusedBox === "year") {
      if (tempYearStr.length > 0) {
        setTempYearStr((prev) => prev.slice(0, -1));
      } else {
        setFocusedBox("day");
      }
    }
  };

  // Calendar cells generation helper
  const getCalendarDays = (m, y) => {
    const startOfMonth = new Date(y, m - 1, 1);
    const startDayOfWeek = startOfMonth.getDay();
    const daysInMonth = getDaysInMonth(startOfMonth);

    const prevMonthDays = getDaysInMonth(new Date(y, m - 2, 1));

    const cells = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthDays - i,
        month: m === 1 ? 12 : m - 1,
        year: m === 1 ? y - 1 : y,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        day: i,
        month: m,
        year: y,
        isCurrentMonth: true,
      });
    }

    const nextMonthMomentMonth = m === 12 ? 1 : m + 1;
    const nextMonthMomentYear = m === 12 ? y + 1 : y;
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        day: i,
        month: nextMonthMomentMonth,
        year: nextMonthMomentYear,
        isCurrentMonth: false,
      });
    }

    return cells;
  };

  // Tab views rendering logic for datepicker
  const renderScrollTab = (handleValueUpdate) => {
    const daysInMonth = getDaysInMonth(new Date(pickerYear, pickerMonth - 1, 1)) || 31;
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Years select scroll, restricted up to current year
    const currentYear = new Date().getFullYear();
    const yearsCount = currentYear - 1800 + 1;
    const years = Array.from({ length: yearsCount }, (_, i) => currentYear - i);

    return (
      <div className="drum-roll-container">
        <div className="drum-roll-highlight-bar" />

        <DrumRollColumn
          options={months}
          value={pickerMonth}
          onChange={(m) => handleValueUpdate(m, pickerDay, pickerYear)}
          label="month"
        />

        <DrumRollColumn
          options={days}
          value={pickerDay}
          onChange={(d) => handleValueUpdate(pickerMonth, d, pickerYear)}
          label="day"
        />

        <DrumRollColumn
          options={years}
          value={pickerYear}
          onChange={(y) => handleValueUpdate(pickerMonth, pickerDay, y)}
          label="year"
        />
      </div>
    );
  };

  const renderCalendarTab = (handleValueUpdate) => {
    const calendarDays = getCalendarDays(calendarMonth, calendarYear);
    const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const monthTitle = format(new Date(calendarYear, calendarMonth - 1, 1), "MMMM yyyy");

    const prevMonth = () => {
      if (calendarMonth === 1) {
        setCalendarMonth(12);
        setCalendarYear(calendarYear - 1);
      } else {
        setCalendarMonth(calendarMonth - 1);
      }
    };

    const nextMonth = () => {
      const today = new Date();
      const nextDate = new Date(calendarYear, calendarMonth, 1);
      if (nextDate.getFullYear() > today.getFullYear() || (nextDate.getFullYear() === today.getFullYear() && nextDate.getMonth() > today.getMonth())) {
        message.warning("Future months are blocked");
        return;
      }
      setCalendarMonth(nextDate.getMonth() + 1);
      setCalendarYear(nextDate.getFullYear());
    };

    const isToday = (day, m, y) => {
      const today = new Date();
      return today.getDate() === day && (today.getMonth() + 1) === m && today.getFullYear() === y;
    };

    return (
      <div className="calendar-picker-wrap">
        <div className="calendar-header">
          <button type="button" className="calendar-nav-btn" onClick={prevMonth}>
            ‹
          </button>
          <span className="calendar-month-title">{monthTitle}</span>
          <button type="button" className="calendar-nav-btn" onClick={nextMonth}>
            ›
          </button>
        </div>
        <div className="calendar-grid">
          {weekdays.map((d) => (
            <div key={d} className="calendar-weekday-cell">{d}</div>
          ))}
          {calendarDays.map((cell, idx) => {
            const isSelected = pickerDay === cell.day && pickerMonth === cell.month && pickerYear === cell.year;
            const cellDate = new Date(cell.year, cell.month - 1, cell.day);
            const isFutureCell = isAfter(cellDate, new Date());

            let cellClass = "calendar-day-cell";
            if (!cell.isCurrentMonth) cellClass += " other-month";
            if (isSelected) cellClass += " selected";
            if (isToday(cell.day, cell.month, cell.year)) cellClass += " today-ring";

            return (
              <div
                key={idx}
                className={cellClass}
                style={isFutureCell ? { opacity: 0.15, cursor: "not-allowed", pointerEvents: "none" } : {}}
                onClick={() => {
                  if (isFutureCell) return;
                  setCalendarMonth(cell.month);
                  setCalendarYear(cell.year);
                  handleValueUpdate(cell.month, cell.day, cell.year);
                }}
              >
                {cell.day}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTypeTab = () => {
    const focusedStyle = "date-type-input focused";
    const normalStyle = "date-type-input";

    return (
      <div style={{ width: "100%" }}>
        <div className="date-type-inputs-row">
          <div className="date-type-box-wrap" onClick={() => selectBox("month")}>
            <div className={focusedBox === "month" ? focusedStyle : normalStyle}>
              {tempMonthStr || "MM"}
            </div>
            <span className="date-type-label">Month</span>
          </div>

          <div className="date-type-box-wrap" onClick={() => selectBox("day")}>
            <div className={focusedBox === "day" ? focusedStyle : normalStyle}>
              {tempDayStr || "DD"}
            </div>
            <span className="date-type-label">Day</span>
          </div>

          <div className="date-type-box-wrap year" onClick={() => selectBox("year")}>
            <div className={focusedBox === "year" ? focusedStyle : normalStyle}>
              {tempYearStr || "YYYY"}
            </div>
            <span className="date-type-label">Year</span>
          </div>
        </div>

        <div className="custom-numpad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              className="numpad-btn"
              onClick={() => handleNumPadPress(num.toString())}
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            className="numpad-btn"
            style={{ visibility: "hidden" }}
          />
          <button
            type="button"
            className="numpad-btn"
            onClick={() => handleNumPadPress("0")}
          >
            0
          </button>
          <button
            type="button"
            className="numpad-btn backspace"
            onClick={handleNumPadBackspace}
          >
            ⌫
          </button>
        </div>
      </div>
    );
  };

  // Master date picker widget layout
  const renderDatePickerWidget = (onDateChange) => {
    const handleValueUpdate = (m, d, y) => {
      const days = getDaysInMonth(new Date(y, m - 1, 1)) || 31;
      const finalDay = d > days ? days : d;

      setPickerMonth(m);
      setPickerDay(finalDay);
      setPickerYear(y);

      const formatted = `${y}-${m.toString().padStart(2, "0")}-${finalDay.toString().padStart(2, "0")}`;
      onDateChange(formatted);
    };

    return (
      <div className="custom-date-picker-area">
        <div className="date-picker-tab-content-wrap">
          <div className="date-picker-tab-content">
            {datePickerTab === "calendar"
              ? renderCalendarTab(handleValueUpdate)
              : datePickerTab === "type"
                ? renderTypeTab()
                : renderScrollTab(handleValueUpdate)}
          </div>
        </div>
      </div>
    );
  };

  // Dynamic date picker live value formatter helper
  const getPickerDisplayValue = (dateStr) => {
    if (datePickerTab === "type") {
      return `${tempMonthStr || "MM"} / ${tempDayStr || "DD"} / ${tempYearStr || "YYYY"}`;
    }
    return dateStr ? format(new Date(dateStr), "MMMM d, yyyy") : "Select date";
  };

  // Steps rendering methods
  const renderNameForm = () => {
    const qText = type === "self" ? "What does the family call you?" : `What does the family call your ${type}?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="wizard-input-container">
          <input
            type="text"
            className={`wizard-input ${validationError ? "validation-failed" : ""}`}
            value={firstName || nickName || ""}
            onChange={(e) => {
              setFirstName(e.target.value);
              setValidationError("");
            }}
            placeholder="Enter name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitNameAsFirstName(firstName);
              }
            }}
          />
          {validationError && <span className="validation-error-hint">{validationError}</span>}
        </div>
        <div className="secondary-action-pills-row">
          <button type="button" className="secondary-action-pill" onClick={() => submitNameAsFirstName(firstName)}>
            First name?
          </button>
          <button type="button" className="secondary-action-pill" onClick={() => submitNameAsNickName(firstName)}>
            Nickname?
          </button>
        </div>
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderNickNameForm = () => {
    const qText = type === "self" ? "Do you have a family nickname?" : `Does ${getDisplayNameForQuestion()} have a family nickname?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="wizard-input-container">
          <input
            type="text"
            className="wizard-input"
            value={nickName}
            onChange={(e) => setNickName(e.target.value)}
            placeholder="Nickname (optional)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitNickName(nickName);
              }
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "16px" }}>
          <button type="button" className="wizard-primary-btn" onClick={() => submitNickName(nickName)}>
            Submit
          </button>
          <button type="button" className="wizard-back-btn" style={{ marginTop: 0 }} onClick={skipNickName}>
            No
          </button>
        </div>
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderFirstNameForm = () => {
    const qText = type === "self" ? "What is your first name?" : `What is their first name?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="wizard-input-container">
          <input
            type="text"
            className={`wizard-input ${validationError ? "validation-failed" : ""}`}
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setValidationError("");
            }}
            placeholder="First name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitFirstName(firstName);
              }
            }}
          />
          {validationError && <span className="validation-error-hint">{validationError}</span>}
        </div>
        <button type="button" className="wizard-primary-btn" onClick={() => submitFirstName(firstName)}>
          Submit
        </button>
        <br />
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderLastNameForm = () => {
    const qText = type === "self" ? "What is your last name?" : `What is ${getDisplayNameForQuestion()}'s last name?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="wizard-input-container">
          <input
            type="text"
            className={`wizard-input ${validationError ? "validation-failed" : ""}`}
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setValidationError("");
            }}
            placeholder="Last name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                submitLastName(lastName);
              }
            }}
          />
          {validationError && <span className="validation-error-hint">{validationError}</span>}
        </div>
        <button type="button" className="wizard-primary-btn" onClick={() => submitLastName(lastName)}>
          Submit
        </button>
        <br />
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderSmithSideForm = () => {
    return (
      <>
        <h2 className="step-question-text">Which side of the family?</h2>
        <p style={{ color: "var(--text)", marginBottom: "20px" }}>Are they on the Smith side of your lineage?</p>
        <div className="gone-home-options-row" style={{ marginTop: 0 }}>
          <button type="button" className="gone-home-option-btn" onClick={() => submitSmithSide(true)}>
            Yes, Smith Side
          </button>
          <button type="button" className="gone-home-option-btn" onClick={() => submitSmithSide(false)}>
            No, Other Side
          </button>
        </div>
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderSunriseForm = () => {
    const qText = type === "self" ? "When did your story begin?" : `When did ${getPossessiveName(getDisplayNameForQuestion())} story begin?`;
    const displayVal = getPickerDisplayValue(sunrise);

    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--plum)", marginBottom: "8px" }}>
          {displayVal}
        </div>
        {validationError && <span className="validation-error-hint" style={{ display: "block", marginBottom: "8px" }}>{validationError}</span>}

        {renderDatePickerWidget((formattedDateStr) => {
          setSunrise(formattedDateStr);
          setConfirmedSunrise(formattedDateStr);
        })}

        <button type="button" className="wizard-primary-btn" style={{ marginTop: "12px" }} onClick={() => submitSunrise(sunrise)}>
          Submit
        </button>
        <br />
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderLivingDeceasedForm = () => {
    const qText = `Has ${getDisplayNameForQuestion()} gone home?`;
    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div className="gone-home-options-row">
          <button type="button" className="gone-home-option-btn" onClick={() => submitLivingStatus(true)}>
            Yes, they have
          </button>
          <button type="button" className="gone-home-option-btn" onClick={() => submitLivingStatus(false)}>
            Still with us
          </button>
        </div>
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderSunsetForm = () => {
    const qText = `When did ${getDisplayNameForQuestion()} go home?`;
    const displayVal = getPickerDisplayValue(sunset);

    return (
      <>
        <h2 className="step-question-text">{qText}</h2>
        <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--plum)", marginBottom: "8px" }}>
          {displayVal}
        </div>
        {validationError && <span className="validation-error-hint" style={{ display: "block", marginBottom: "8px" }}>{validationError}</span>}

        {renderDatePickerWidget((formattedDateStr) => {
          setSunset(formattedDateStr);
          setConfirmedSunset(formattedDateStr);
        })}

        <button type="button" className="wizard-primary-btn" style={{ marginTop: "12px" }} onClick={() => submitSunset(sunset)}>
          Submit
        </button>
        <br />
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderConfirmCard = () => {
    const formattedSunriseStr = sunrise ? format(new Date(sunrise), "MMMM d, yyyy") : "N/A";
    const formattedSunsetStr = sunset ? format(new Date(sunset), "MMMM d, yyyy") : "N/A";

    return (
      <>
        <h2 className="step-question-text">Is this information correct?</h2>

        <div style={{ textAlign: "left", width: "100%", maxWidth: "320px", margin: "0 auto 16px", padding: "12px", backgroundColor: "var(--parchment)", borderRadius: "12px", border: "1px solid var(--border)" }}>
          <div style={{ marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--plum)", fontWeight: "700", display: "block", textTransform: "uppercase" }}>First Name</span>
            <span style={{ fontSize: "1rem", color: "var(--text)", fontWeight: "600" }}>{firstName || "N/A"}</span>
          </div>
          {nickName && (
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--plum)", fontWeight: "700", display: "block", textTransform: "uppercase" }}>Nickname</span>
              <span style={{ fontSize: "1rem", color: "var(--text)", fontWeight: "600" }}>{nickName}</span>
            </div>
          )}
          <div style={{ marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--plum)", fontWeight: "700", display: "block", textTransform: "uppercase" }}>Last Name</span>
            <span style={{ fontSize: "1rem", color: "var(--text)", fontWeight: "600" }}>{lastName || "N/A"}</span>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--plum)", fontWeight: "700", display: "block", textTransform: "uppercase" }}>Sunrise</span>
            <span style={{ fontSize: "1rem", color: "var(--text)", fontWeight: "600" }}>{formattedSunriseStr}</span>
          </div>
          {sunset && (
            <div style={{ marginBottom: "8px" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--plum)", fontWeight: "700", display: "block", textTransform: "uppercase" }}>Sunset</span>
              <span style={{ fontSize: "1rem", color: "var(--text)", fontWeight: "600" }}>{formattedSunsetStr}</span>
            </div>
          )}
        </div>

        <button type="button" className="wizard-primary-btn" onClick={handleSaveProfile} disabled={loading}>
          {loading ? "Saving..." : "Create profile"}
        </button>
        <br />
        <button type="button" className="wizard-back-btn" onClick={goBack}>
          Back
        </button>
      </>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "NameForm":
        return renderNameForm();
      case "NickNameForm":
        return renderNickNameForm();
      case "FirstNameForm":
        return renderFirstNameForm();
      case "LastNameForm":
        return renderLastNameForm();
      case "SmithSideForm":
        return renderSmithSideForm();
      case "SunriseForm":
        return renderSunriseForm();
      case "LivingDeceasedForm":
        return renderLivingDeceasedForm();
      case "SunsetForm":
        return renderSunsetForm();
      case "ConfirmCard":
        return renderConfirmCard();
      default:
        return null;
    }
  };

  // Card Bezel Markup
  const ProfileCardPreview = () => {
    const initials = `${firstName?.[0] || nickName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
    const badgeText = getBadgeText();
    const hasName = confirmedFirstName || confirmedLastName || confirmedNickName;

    return (
      <div className="profile-card-preview-container">
        <div className={`preview-card-wrap ${playingPayoff ? "done-moment" : ""}`}>

          {playingPayoff && (
            <div className="checkmark-overlay">
              <svg className="checkmark-svg" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
          )}

          {/* Eyebrow */}
          <span className="preview-eyebrow">
            {badgeText}
          </span>

          <div className="preview-avatar-placeholder">
            <AnimatePresence mode="popLayout">
              {initials ? (
                <motion.span
                  key={initials}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.35 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="preview-spring-initials active"
                >
                  {initials}
                </motion.span>
              ) : (
                <motion.span
                  key="empty-avatar"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.3 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="preview-spring-initials"
                >
                  ?
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Identity details */}
          <div className="preview-identity-overlay">
            <AnimatePresence mode="wait">
              {hasName && (
                <motion.h1
                  key={`${confirmedFirstName}-${confirmedNickName}-${confirmedLastName}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="preview-name-text"
                >
                  {confirmedFirstName} {confirmedLastName}
                </motion.h1>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {confirmedNickName && (
                <motion.p
                  key={confirmedNickName}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="preview-nickname-text"
                >
                  "{confirmedNickName}"
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {confirmedSunrise && (
                <motion.div
                  key={`${confirmedSunrise}-${confirmedSunset}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="preview-lifespan-text"
                >
                  <span>{format(new Date(confirmedSunrise), "MMM d, yyyy")}</span>
                  {confirmedSunset && (
                    <>
                      <span>&mdash;</span>
                      <span>{format(new Date(confirmedSunset), "MMM d, yyyy")}</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  };

  // Framer Motion exit/enter variants
  const stepVariants = {
    enter: (dir) => ({
      opacity: 0,
      y: dir > 0 ? 20 : -30,
    }),
    center: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.25, ease: "easeOut" },
    },
    exit: (dir) => ({
      opacity: 0,
      y: dir > 0 ? -30 : 20,
      transition: { duration: 0.2, ease: "easeIn" },
    }),
  };

  return (
    <div className="profile-form-split-container">
      {/* Top/Left Hero Card Preview */}
      {!keyboardOpen && <ProfileCardPreview />}

      {/* Floating Pill (Anchored above keyboard when open) */}
      <AnimatePresence>
        {keyboardOpen && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="keyboard-floating-pill"
            style={{
              position: "fixed",
              bottom: `calc(100vh - ${viewportHeight}px + 12px)`,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 999,
            }}
          >
            <button
              type="button"
              className="floating-pill-nav"
              disabled={history.length === 1}
              onClick={goBack}
            >
              ← Back
            </button>

            <div className="floating-pill-chips">
              {confirmedFirstName && (
                <span className="name-chip" onClick={jumpToFirstName}>
                  {confirmedFirstName}
                </span>
              )}
              {confirmedNickName && (
                <span className="name-chip" onClick={() => jumpToStep("NickNameForm")}>
                  "{confirmedNickName}"
                </span>
              )}
              {confirmedLastName && (
                <span className="name-chip" onClick={() => jumpToStep("LastNameForm")}>
                  {confirmedLastName}
                </span>
              )}
            </div>

            <button
              type="button"
              className="floating-pill-nav"
              onClick={goNextFromPill}
            >
              Next →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom/Right Step Controller Container */}
      <div className="profile-form-step-container">
        {/* Progress dots row */}
        <div className="progress-dots-row">
          {getStepsPath().map((stepName, idx) => {
            let dotClass = "progress-dot";
            if (stepName === currentStep) {
              dotClass += " current";
            } else if (history.includes(stepName)) {
              dotClass += " completed";
            } else {
              dotClass += " upcoming";
            }
            return <div key={idx} className={dotClass} />;
          })}
        </div>

        {/* Wizard Form Cards */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="step-card"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ProfileWizard;
