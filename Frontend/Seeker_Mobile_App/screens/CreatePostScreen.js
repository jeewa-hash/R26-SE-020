import React, {
  useState,
  useRef,
  useContext,
  useEffect,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import * as ImagePicker from 'expo-image-picker';

import { LinearGradient } from 'expo-linear-gradient';

import { useTranslation } from 'react-i18next';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { LanguageContext } from '../context/LanguageContext';
import { useTheme } from '../hooks/useTheme';


// =======================================================
// API BASE URL
// =======================================================

const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:6000'
    : 'http://localhost:6000';


// =======================================================
// VALIDATE MONGODB OBJECT ID
// =======================================================

const isValidObjectId = (value) => {
  if (!value) {
    return false;
  }

  return /^[0-9a-fA-F]{24}$/.test(
    String(value)
  );
};


// =======================================================
// GET LOGGED USER
// =======================================================

const getLoggedUser = async () => {
  try {
    const storedUser =
      await AsyncStorage.getItem('user');

    console.log(
      '======================================'
    );

    console.log(
      'AUTH STORAGE RAW USER:',
      storedUser
    );

    console.log(
      '======================================'
    );

    if (!storedUser) {
      console.error(
        'NO USER FOUND IN ASYNC STORAGE'
      );

      return null;
    }

    let user;

    try {
      user = JSON.parse(
        storedUser
      );
    } catch (error) {
      console.error(
        'FAILED TO PARSE USER:',
        error
      );

      return null;
    }

    console.log(
      'PARSED AUTH USER:',
      JSON.stringify(
        user,
        null,
        2
      )
    );

    // =====================================================
    // GET MONGODB ID
    // =====================================================

    const userId =
      user?.id ||
      user?._id ||
      user?.userId ||
      user?.seekerId;

    console.log(
      'EXTRACTED USER ID:',
      userId
    );

    // =====================================================
    // ID REQUIRED
    // =====================================================

    if (!userId) {
      console.error(
        'USER ID NOT FOUND IN ASYNC STORAGE'
      );

      return null;
    }

    // =====================================================
    // VALIDATE ID
    // =====================================================

    if (
      !isValidObjectId(userId)
    ) {
      console.error(
        'INVALID MONGODB OBJECT ID:',
        userId
      );

      return null;
    }

    // =====================================================
    // GET NAME
    // =====================================================

    const userName =
      user?.name ||
      user?.fullName ||
      user?.username ||
      'Customer';

    // =====================================================
    // GET PROFILE IMAGE
    // =====================================================

    const profileImage =
      user?.profileImage ||
      user?.avatar ||
      null;

    console.log(
      '--------------------------------------'
    );

    console.log(
      'FINAL USER ID:',
      String(userId)
    );

    console.log(
      'FINAL USER NAME:',
      userName
    );

    console.log(
      'FINAL PROFILE IMAGE:',
      profileImage
    );

    console.log(
      '--------------------------------------'
    );

    return {
      userId: String(userId),
      userName,
      profileImage,
      rawUser: user,
    };

  } catch (error) {
    console.error(
      'GET LOGGED USER ERROR:',
      error
    );

    return null;
  }
};


// =======================================================
// CREATE POST SCREEN
// =======================================================

export default function CreatePostScreen() {
  const navigation =
    useNavigation();

  const route =
    useRoute();

  const { t } =
    useTranslation();

  const { language } =
    useContext(
      LanguageContext
    );

  const { isDarkMode } = useTheme(); // ✅ Dark mode


  // =====================================================
  // EDIT MODE
  // =====================================================

  const [isEditMode, setIsEditMode] =
    useState(false);

  const [editPostId, setEditPostId] =
    useState(null);

  const [originalImagePath, setOriginalImagePath] =
    useState(null);


  // =====================================================
  // FORM STATE
  // =====================================================

  const [loading, setLoading] =
    useState(false);

  const [previewLoading, setPreviewLoading] =
    useState(false);

  const [title, setTitle] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [previewData, setPreviewData] =
    useState(null);

  const [previewVisible, setPreviewVisible] =
    useState(false);

  const [activeField, setActiveField] =
    useState(null);


  // =====================================================
  // ANIMATION
  // =====================================================

  const scrollY =
    useRef(
      new Animated.Value(0)
    ).current;

  const titleScale =
    scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [1, 0.95],
      extrapolate: 'clamp',
    });


  // =====================================================
  // GET IMAGE URL
  // =====================================================

  const getImageUrl = (
    imagePath
  ) => {
    if (!imagePath) {
      return null;
    }

    const image =
      String(imagePath);

    if (
      image.startsWith(
        'http://'
      ) ||
      image.startsWith(
        'https://'
      )
    ) {
      return image;
    }

    return `${API_BASE_URL}/${image.replace(
      /\\/g,
      '/'
    )}`;
  };


  // =====================================================
  // EDIT MODE INITIALIZATION
  // =====================================================

  useEffect(() => {
    const {
      editMode,
      postData,
    } =
      route.params || {};

    if (
      editMode &&
      postData
    ) {
      console.log(
        'EDIT POST DATA:',
        JSON.stringify(
          postData,
          null,
          2
        )
      );

      setIsEditMode(true);

      setEditPostId(
        postData._id ||
        postData.id
      );

      setTitle(
        postData.title || ''
      );

      setDescription(
        postData.description || ''
      );

      if (
        postData.image
      ) {
        const imageUrl =
          getImageUrl(
            postData.image
          );

        setSelectedImage(
          imageUrl
        );

        setOriginalImagePath(
          postData.image
        );
      }

      setPreviewData({
        image:
          postData.image ||
          null,

        title:
          postData.title ||
          '',

        description:
          postData.description ||
          '',

        category:
          postData.category ||
          'General',

        urgency:
          postData.urgency ||
          'medium',

        tags:
          Array.isArray(
            postData.tags
          )
            ? postData.tags
            : [],
      });
    }
  }, [
    route.params,
  ]);


  // =====================================================
  // PICK IMAGE
  // =====================================================

  const pickImage =
    async () => {
      try {
        const {
          status,
        } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (
          status !==
          'granted'
        ) {
          Alert.alert(
            'Permission Required',
            'Gallery access is required.'
          );

          return;
        }

        const result =
          await ImagePicker.launchImageLibraryAsync(
            {
              mediaTypes:
                ImagePicker
                  .MediaTypeOptions
                  .Images,

              allowsEditing:
                true,

              aspect: [4, 3],

              quality: 0.8,
            }
          );

        if (
          !result.canceled &&
          result.assets?.length
        ) {
          const imageUri =
            result.assets[0].uri;

          console.log(
            'SELECTED IMAGE:',
            imageUri
          );

          setSelectedImage(
            imageUri
          );

          setPreviewData(
            null
          );
        }

      } catch (error) {
        console.error(
          'IMAGE PICKER ERROR:',
          error
        );

        Alert.alert(
          'Error',
          'Could not select image.'
        );
      }
    };


  // =====================================================
  // REMOVE IMAGE
  // =====================================================

  const removeImage =
    () => {
      setSelectedImage(
        null
      );

      setOriginalImagePath(
        null
      );

      setPreviewData(
        null
      );
    };


  // =====================================================
  // GENERATE AI PREVIEW
  // =====================================================

  const generatePreview =
    async () => {

      if (!selectedImage) {
        Alert.alert(
          'Missing Image',
          'Please upload an image first.'
        );

        return;
      }

      if (
        isEditMode &&
        originalImagePath &&
        selectedImage ===
          getImageUrl(
            originalImagePath
          )
      ) {
        Alert.alert(
          'Info',
          'Image unchanged. Select a new image to generate a new AI preview.'
        );

        return;
      }

      setPreviewLoading(
        true
      );

      try {
        const formData =
          new FormData();

        formData.append(
          'image',
          {
            uri: selectedImage,
            type: 'image/jpeg',
            name: 'post.jpg',
          }
        );

        formData.append(
          'title',
          title || ''
        );

        formData.append(
          'description',
          description || ''
        );

        console.log(
          'GENERATING AI PREVIEW...'
        );

        const response =
          await fetch(
            `${API_BASE_URL}/posts/preview`,
            {
              method: 'POST',

              body: formData,
            }
          );

        const rawText =
          await response.text();

        console.log(
          'PREVIEW RESPONSE:',
          rawText
        );

        let data;

        try {
          data =
            JSON.parse(
              rawText
            );
        } catch (error) {
          Alert.alert(
            'Server Error',
            'Backend returned invalid JSON.'
          );

          return;
        }

        if (
          response.ok &&
          data.success &&
          data.preview
        ) {
          setPreviewData(
            data.preview
          );

          setTitle(
            data.preview.title ||
              title
          );

          setDescription(
            data.preview.description ||
              description
          );

          setPreviewVisible(
            true
          );

        } else {
          Alert.alert(
            'Preview Failed',
            data.error ||
              data.message ||
              'Could not generate preview.'
          );
        }

      } catch (error) {
        console.error(
          'PREVIEW ERROR:',
          error
        );

        Alert.alert(
          'Network Error',
          error.message
        );

      } finally {
        setPreviewLoading(
          false
        );
      }
    };


  // =====================================================
  // SAVE / UPDATE POST
  // =====================================================

  const savePost =
    async () => {

      if (!title.trim()) {
        Alert.alert(
          'Missing Title',
          'Please enter a title.'
        );

        return;
      }

      if (
        !description.trim()
      ) {
        Alert.alert(
          'Missing Description',
          'Please enter a description.'
        );

        return;
      }

      // ===================================================
      // GET LOGGED USER
      // ===================================================

      const loggedUser =
        await getLoggedUser();

      console.log(
        'LOGGED USER:',
        loggedUser
      );

      if (
        !loggedUser ||
        !loggedUser.userId
      ) {
        Alert.alert(
          'Login Required',
          'Could not find your user ID. Please logout and login again.'
        );

        return;
      }

      // We'll use this as seekerId
      const seekerId =
        loggedUser.userId;

      // ===================================================
      // FINAL IMAGE
      // ===================================================

      let finalImagePath =
        null;

      if (isEditMode) {

        if (
          previewData?.image &&
          selectedImage !==
            getImageUrl(
              originalImagePath
            )
        ) {
          finalImagePath =
            previewData.image;
        }

        else if (
          originalImagePath
        ) {
          finalImagePath =
            originalImagePath;
        }

        else {
          Alert.alert(
            'Missing Image',
            'No image associated with this post.'
          );

          return;
        }

      } else {

        if (
          !previewData?.image
        ) {
          Alert.alert(
            'Preview Required',
            'Please generate AI preview first.'
          );

          return;
        }

        finalImagePath =
          previewData.image;
      }


      // ===================================================
      // FINAL PAYLOAD
      // ===================================================

      const payload = {
        title:
          title.trim(),

        description:
          description.trim(),

        image:
          finalImagePath,

        category:
          previewData?.category ||
          'General',

        tags:
          Array.isArray(
            previewData?.tags
          )
            ? previewData.tags
            : [],

        urgency:
          previewData?.urgency ||
          'medium',

        // Include both seekerId and userId for backend compatibility
        seekerId:
          seekerId,

        userId:
          seekerId,
      };


      console.log(
        '======================================'
      );

      console.log(
        'FINAL SEEKER ID:',
        seekerId
      );

      console.log(
        'FINAL POST PAYLOAD:',
        JSON.stringify(
          payload,
          null,
          2
        )
      );

      console.log(
        '======================================'
      );


      // ===================================================
      // URL
      // ===================================================

      let url =
        `${API_BASE_URL}/posts/publish`;

      let method =
        'POST';

      if (isEditMode) {

        if (!editPostId) {
          Alert.alert(
            'Error',
            'Post ID is missing.'
          );

          return;
        }

        url =
          `${API_BASE_URL}/posts/update/${editPostId}`;

        method =
          'PUT';
      }


      // ===================================================
      // SEND REQUEST
      // ===================================================

      setLoading(true);

      try {

        console.log(
          'REQUEST URL:',
          url
        );

        console.log(
          'REQUEST METHOD:',
          method
        );

        const response =
          await fetch(
            url,
            {
              method,

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload
                ),
            }
          );

        const rawText =
          await response.text();

        console.log(
          'SAVE RESPONSE:',
          rawText
        );

        let data;

        try {
          data =
            JSON.parse(
              rawText
            );
        } catch (error) {
          Alert.alert(
            'Server Error',
            'Backend did not return valid JSON.'
          );

          return;
        }

        if (
          response.ok &&
          data.success
        ) {

          Alert.alert(
            'Success',

            isEditMode
              ? 'Post updated successfully!'
              : 'Post published successfully!',

            [
              {
                text: 'OK',

                onPress:
                  () =>
                    navigation.goBack(),
              },
            ]
          );

        } else {

          console.error(
            'SAVE FAILED:',
            data
          );

          Alert.alert(
            'Save Failed',
            data.error ||
              data.message ||
              'Something went wrong.'
          );
        }

      } catch (error) {

        console.error(
          'SAVE ERROR:',
          error
        );

        Alert.alert(
          'Network Error',
          error.message
        );

      } finally {
        setLoading(false);
      }
    };


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1a1a2e"
      />

      <Animated.ScrollView
        style={
          styles.scrollView
        }

        showsVerticalScrollIndicator={
          false
        }

        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  y: scrollY,
                },
              },
            },
          ],
          {
            useNativeDriver:
              false,
          }
        )}

        scrollEventThrottle={
          16
        }
      >

        {/* HERO */}

        <LinearGradient
          colors={[
            '#667eea',
            '#764ba2',
            '#f093fb',
          ]}
          style={
            styles.heroSection
          }
        >
          <Animated.View
            style={[
              styles.heroContent,
              {
                transform: [
                  {
                    scale:
                      titleScale,
                  },
                ],
              },
            ]}
          >
            <View
              style={
                styles.heroIconBg
              }
            >
              <Ionicons
                name="sparkles-outline"
                size={32}
                color="#667eea"
              />
            </View>

            <Text
              style={
                styles.heroTitle
              }
            >
              {isEditMode
                ? 'Edit Your Post'
                : 'AI Smart Post Creator'}
            </Text>

            <Text
              style={
                styles.heroSubtitle
              }
            >
              {isEditMode
                ? 'Modify your existing post'
                : 'Upload an image and let AI generate the perfect post'}
            </Text>
          </Animated.View>
        </LinearGradient>


        {/* FORM */}

        <View
          style={[styles.formContainer, isDarkMode && styles.formContainerDark]}
        >

          {/* TITLE */}

          <View
            style={[
              styles.inputContainer,
              isDarkMode && styles.inputContainerDark,
              activeField ===
                'title' &&
                styles.inputContainerActive,
            ]}
          >
            <Text
              style={[styles.inputLabel, isDarkMode && styles.textDark]}
            >
              Post Title
            </Text>

            <TextInput
              style={[styles.titleInput, isDarkMode && styles.textDark]}
              placeholder="What's your post about?"
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              value={title}
              onChangeText={
                setTitle
              }
              onFocus={() =>
                setActiveField(
                  'title'
                )
              }
              onBlur={() =>
                setActiveField(
                  null
                )
              }
            />
          </View>


          {/* DESCRIPTION */}

          <View
            style={[
              styles.inputContainer,
              isDarkMode && styles.inputContainerDark,
              activeField ===
                'desc' &&
                styles.inputContainerActive,
            ]}
          >
            <Text
              style={[styles.inputLabel, isDarkMode && styles.textDark]}
            >
              Description
            </Text>

            <TextInput
              style={[styles.descriptionInput, isDarkMode && styles.textDark]}
              multiline
              numberOfLines={5}
              placeholder="Describe the issue, request, or service needed..."
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              value={
                description
              }
              onChangeText={
                setDescription
              }
              onFocus={() =>
                setActiveField(
                  'desc'
                )
              }
              onBlur={() =>
                setActiveField(
                  null
                )
              }
            />
          </View>


          {/* IMAGE */}

          <View
            style={
              styles.uploadSection
            }
          >
            <Text
              style={[styles.sectionTitle, isDarkMode && styles.textDark]}
            >
              Upload Image
            </Text>

            {selectedImage ? (
              <View
                style={
                  styles.imagePreviewWrapper
                }
              >
                <Image
                  source={{
                    uri: selectedImage,
                  }}
                  style={
                    styles.previewImage
                  }
                />

                <TouchableOpacity
                  style={
                    styles.removeImageBtn
                  }
                  onPress={
                    removeImage
                  }
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadButton, isDarkMode && styles.uploadButtonDark]}
                onPress={
                  pickImage
                }
              >
                <Ionicons
                  name="camera-outline"
                  size={40}
                  color="#667eea"
                />

                <Text
                  style={[styles.uploadText, isDarkMode && styles.textDark]}
                >
                  Tap to Upload Image
                </Text>

                <Text
                  style={[styles.uploadSubtext, isDarkMode && styles.textMutedDark]}
                >
                  JPG, PNG up to 5MB
                </Text>
              </TouchableOpacity>
            )}
          </View>


          {/* AI PREVIEW BUTTON */}

          {(
            !isEditMode ||
            (
              isEditMode &&
              selectedImage !==
                getImageUrl(
                  originalImagePath
                )
            )
          ) && (
            <TouchableOpacity
              style={
                styles.previewButton
              }

              onPress={
                generatePreview
              }

              disabled={
                previewLoading
              }
            >
              <LinearGradient
                colors={[
                  '#8B5CF6',
                  '#6366F1',
                ]}
                style={
                  styles.previewGradient
                }
              >
                {previewLoading ? (
                  <ActivityIndicator
                    color="#fff"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="sparkles"
                      size={20}
                      color="#fff"
                    />

                    <Text
                      style={
                        styles.previewButtonText
                      }
                    >
                      Generate AI Preview
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

        </View>
      </Animated.ScrollView>


      {/* SAVE BUTTON */}

      <TouchableOpacity
        style={
          styles.floatingButton
        }

        onPress={
          savePost
        }

        disabled={
          loading
        }
      >
        <LinearGradient
          colors={[
            '#667eea',
            '#764ba2',
          ]}
          style={
            styles.floatingGradient
          }
        >
          {loading ? (
            <ActivityIndicator
              color="#fff"
            />
          ) : (
            <>
              <Ionicons
                name={
                  isEditMode
                    ? 'save'
                    : 'send'
                }
                size={20}
                color="#fff"
              />

              <Text
                style={
                  styles.floatingButtonText
                }
              >
                {isEditMode
                  ? 'Update Post'
                  : 'Publish Post'}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>


      {/* PREVIEW MODAL */}

      <Modal
        visible={
          previewVisible
        }
        animationType="slide"
        transparent
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={[styles.previewModal, isDarkMode && styles.previewModalDark]}
          >
            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
            >

              <Text
                style={[styles.previewTitle, isDarkMode && styles.textDark]}
              >
                ✨ AI Generated Preview
              </Text>

              {previewData?.image && (
                <Image
                  source={{
                    uri:
                      getImageUrl(
                        previewData.image
                      ),
                  }}
                  style={
                    styles.modalImage
                  }
                />
              )}

              <Text
                style={[styles.previewHeading, isDarkMode && styles.textDark]}
              >
                Title
              </Text>

              <Text
                style={[styles.previewText, isDarkMode && styles.textMutedDark]}
              >
                {
                  previewData?.title
                }
              </Text>

              <Text
                style={[styles.previewHeading, isDarkMode && styles.textDark]}
              >
                Description
              </Text>

              <Text
                style={[styles.previewText, isDarkMode && styles.textMutedDark]}
              >
                {
                  previewData?.description
                }
              </Text>

              <Text
                style={[styles.previewHeading, isDarkMode && styles.textDark]}
              >
                Category
              </Text>

              <Text
                style={[styles.previewText, isDarkMode && styles.textMutedDark]}
              >
                {
                  previewData?.category
                }
              </Text>

              <Text
                style={[styles.previewHeading, isDarkMode && styles.textDark]}
              >
                Urgency
              </Text>

              <Text
                style={[styles.previewText, isDarkMode && styles.textMutedDark]}
              >
                {
                  previewData?.urgency
                }
              </Text>

              <Text
                style={[styles.previewHeading, isDarkMode && styles.textDark]}
              >
                Suggested Tags
              </Text>

              <View
                style={
                  styles.tagsContainer
                }
              >
                {previewData?.tags?.map(
                  (
                    tag,
                    idx
                  ) => (
                    <View
                      key={idx}
                      style={[styles.tag, isDarkMode && styles.tagDark]}
                    >
                      <Text
                        style={[styles.tagText, isDarkMode && styles.tagTextDark]}
                      >
                        #{tag}
                      </Text>
                    </View>
                  )
                )}
              </View>

              <View
                style={
                  styles.modalButtons
                }
              >

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.editButton,
                    isDarkMode && styles.editButtonDark,
                  ]}
                  onPress={() =>
                    setPreviewVisible(
                      false
                    )
                  }
                >
                  <Text
                    style={[styles.editButtonText, isDarkMode && styles.textMutedDark]}
                  >
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.publishButton,
                  ]}
                  onPress={() => {
                    setPreviewVisible(
                      false
                    );

                    savePost();
                  }}
                >
                  <LinearGradient
                    colors={[
                      '#667eea',
                      '#764ba2',
                    ]}
                    style={
                      styles.publishGradient
                    }
                  >
                    <Text
                      style={
                        styles.publishButtonText
                      }
                    >
                      Publish Now
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


// =======================================================
// STYLES
// =======================================================

const styles =
  StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },

    containerDark: {
      backgroundColor: '#0f1121',
    },

    scrollView: {
      flex: 1,
    },

    heroSection: {
      paddingTop: 60,
      paddingBottom: 40,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },

    heroContent: {
      alignItems: 'center',
      paddingHorizontal: 20,
    },

    heroIconBg: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },

    heroTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: '#fff',
      marginBottom: 8,
    },

    heroSubtitle: {
      fontSize: 14,
      color: '#ffffffcc',
      textAlign: 'center',
    },

    formContainer: {
      padding: 20,
      paddingBottom: 120,
    },

    formContainerDark: {
      backgroundColor: '#0f1121',
    },

    inputContainer: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#eee',
    },

    inputContainerDark: {
      backgroundColor: '#16213e',
      borderColor: '#2d3561',
    },

    inputContainerActive: {
      borderColor: '#667eea',
    },

    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 10,
      color: '#1F2937',
    },

    titleInput: {
      fontSize: 16,
      color: '#111827',
    },

    descriptionInput: {
      minHeight: 100,
      textAlignVertical: 'top',
      fontSize: 15,
      color: '#111827',
    },

    uploadSection: {
      marginTop: 10,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 14,
      color: '#1F2937',
    },

    uploadButton: {
      backgroundColor: '#fff',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#ddd',
      borderStyle: 'dashed',
      padding: 30,
      alignItems: 'center',
    },

    uploadButtonDark: {
      backgroundColor: '#16213e',
      borderColor: '#2d3561',
    },

    uploadText: {
      marginTop: 10,
      color: '#667eea',
      fontWeight: '600',
    },

    uploadSubtext: {
      fontSize: 11,
      color: '#9CA3AF',
      marginTop: 4,
    },

    imagePreviewWrapper: {
      position: 'relative',
    },

    previewImage: {
      width: '100%',
      height: 220,
      borderRadius: 20,
    },

    removeImageBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 35,
      height: 35,
      borderRadius: 18,
      backgroundColor: '#EF4444',
      justifyContent: 'center',
      alignItems: 'center',
    },

    previewButton: {
      marginTop: 24,
      borderRadius: 16,
      overflow: 'hidden',
    },

    previewGradient: {
      paddingVertical: 16,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },

    previewButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },

    floatingButton: {
      position: 'absolute',
      bottom: 30,
      left: 20,
      right: 20,
      borderRadius: 18,
      overflow: 'hidden',
    },

    floatingGradient: {
      paddingVertical: 18,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },

    floatingButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      padding: 20,
    },

    previewModal: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: 20,
      maxHeight: '90%',
    },

    previewModalDark: {
      backgroundColor: '#16213e',
    },

    previewTitle: {
      fontSize: 22,
      fontWeight: '700',
      marginBottom: 20,
      textAlign: 'center',
    },

    modalImage: {
      width: '100%',
      height: 200,
      borderRadius: 16,
      marginBottom: 20,
    },

    previewHeading: {
      fontSize: 16,
      fontWeight: '700',
      marginTop: 12,
      marginBottom: 6,
      color: '#1F2937',
    },

    previewText: {
      fontSize: 14,
      color: '#374151',
      lineHeight: 22,
    },

    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 10,
    },

    tag: {
      backgroundColor: '#EEF2FF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
    },

    tagDark: {
      backgroundColor: '#242f4d',
    },

    tagText: {
      color: '#4F46E5',
      fontWeight: '600',
    },

    tagTextDark: {
      color: '#818cf8',
    },

    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },

    modalButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },

    editButton: {
      backgroundColor: '#F3F4F6',
      paddingVertical: 14,
      alignItems: 'center',
    },

    editButtonDark: {
      backgroundColor: '#242f4d',
    },

    editButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#6B7280',
    },

    publishButton: {
      overflow: 'hidden',
    },

    publishGradient: {
      paddingVertical: 14,
      alignItems: 'center',
    },

    publishButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#fff',
    },

    textDark: {
      color: '#F8FAFC',
    },

    textMutedDark: {
      color: '#94A3B8',
    },
  });