import { Avatar, Box, Button, Divider, Flex, Image, Spinner, Text, IconButton, useColorMode, Modal, ModalOverlay, ModalContent, ModalCloseButton, useDisclosure } from "@chakra-ui/react";
import Actions from "../components/Actions";
import { useEffect, useMemo, useState, useCallback } from "react";
import useGetUserProfile from "../hooks/useGetUserProfile";
import useShowToast from "../hooks/useShowToast";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useRecoilState, useRecoilValue } from "recoil";
import userAtom from "../atoms/userAtom";
import { DeleteIcon, ArrowBackIcon, ChevronLeftIcon, ChevronRightIcon } from "@chakra-ui/icons";
import postsAtom from "../atoms/postsAtom";

const PostPage = () => {
  const { user, loading } = useGetUserProfile();
  const [isLoadingPost, setIsLoadingPost] = useState(false);
  const [posts, setPosts] = useRecoilState(postsAtom);
  const { colorMode } = useColorMode();
  const showToast = useShowToast();
  const { pid } = useParams();
  const currentUser = useRecoilValue(userAtom);
  const navigate = useNavigate();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Tìm post hiện tại
  const currentPost = useMemo(() => {
    return posts.find((post) => post._id === pid);
  }, [posts, pid]);

  useEffect(() => {
    const getPost = async () => {
      if (!pid) return;
      setIsLoadingPost(true);
      try {
        const res = await fetch(`/api/posts/${pid}`);
        const data = await res.json();
        console.log("Fetched post data:", data);
        console.log("Images array:", data.img);

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch post");
        }

        setPosts((prevPosts) => {
          const existingPostIndex = prevPosts.findIndex((p) => p._id === data._id);
          if (existingPostIndex !== -1) {
            const updatedPosts = [...prevPosts];
            updatedPosts[existingPostIndex] = data;
            return updatedPosts;
          }
          return [data, ...prevPosts];
        });
      } catch (error) {
        showToast("Error", error.message, "error");
      } finally {
        setIsLoadingPost(false);
      }
    };

    getPost();
  }, [pid, setPosts, showToast]);
  useEffect(() => {
    const handleScroll = (e) => {
      const container = e.target;
      const scrollPosition = container.scrollLeft;
      const imageWidth = container.offsetWidth;
      const newIndex = Math.round(scrollPosition / imageWidth);
      setCurrentImageIndex(newIndex);
    };

    const imageContainer = document.querySelector(".image-container");
    if (imageContainer) {
      imageContainer.addEventListener("scroll", handleScroll);
      return () => imageContainer.removeEventListener("scroll", handleScroll);
    }
  }, []);
  // Xử lý thêm reply mới
  const updateReplies = useCallback(
    (newReply) => {
      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p._id === currentPost?._id) {
            const currentReplies = p.replies || [];
            if (!currentReplies.some((r) => r._id === newReply._id)) {
              // Thêm reply mới và sắp xếp lại theo thời gian
              const updatedReplies = [newReply, ...currentReplies].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              return {
                ...p,
                replies: updatedReplies,
              };
            }
          }
          return p;
        })
      );

      // Fetch lại post sau khi thêm reply để đồng bộ dữ liệu
      const fetchUpdatedPost = async () => {
        try {
          const res = await fetch(`/api/posts/${currentPost._id}`);
          const data = await res.json();
          if (res.ok) {
            setPosts((prevPosts) => prevPosts.map((p) => (p._id === data._id ? data : p)));
          }
        } catch (error) {
          console.error("Error fetching updated post:", error);
        }
      };

      fetchUpdatedPost();
    },
    [currentPost?._id, setPosts]
  );

  // Xử lý xóa post
  const handleDeletePost = async () => {
    try {
      if (!window.confirm("Are you sure you want to delete this post?")) return;

      const res = await fetch(`/api/posts/${currentPost._id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete post");
      }

      showToast("Success", "Post deleted", "success");
      navigate(`/${user.username}`);
    } catch (error) {
      showToast("Error", error.message, "error");
    }
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? currentPost.img.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === currentPost.img.length - 1 ? 0 : prev + 1));
  };

  if (loading || isLoadingPost || !currentPost || !user) {
    return (
      <Flex justifyContent="center" alignItems="center" minH="100vh">
        <Spinner size="xl" />
      </Flex>
    );
  }
  // Render component
  return (
    <Box position="relative">
      <IconButton
        icon={<ArrowBackIcon />}
        aria-label="Go Back"
        position="absolute"
        top="-40px"
        left="10px"
        size="sm"
        onClick={() => navigate(-1)}
        color={colorMode === "dark" ? "white" : "black"}
        _hover={{ bg: "gray.600" }}
        _active={{ bg: "gray.500" }}
        isRound
      />

      <Box
        bg={colorMode === "dark" ? "#181818" : "white"}
        mx="auto"
        border="1px solid rgba(128, 128, 128, 0.5)"
        borderRadius="20px"
        p="8"
        mb="6"
        mt={"120px"}
        w={{ base: "660px", md: "900px", lg: "660px" }}
      >
        {/* User Info */}
        <Flex>
          <Flex w={"full"} alignItems={"center"} gap={3}>
            <Avatar src={user?.profilePic} size={"md"} name={user?.username || "User"} />
            <Flex>
              <Text fontSize={"sm"} fontWeight={"bold"}>
                {user?.username || "Unknown User"}
              </Text>
              <Image src="/verified.png" w="4" h={4} ml={1} />
            </Flex>
          </Flex>
          <Flex gap={4} alignItems={"center"}>
            <Text fontSize={"xs"} width={36} textAlign={"right"} color={"gray.light"}>
              {currentPost.createdAt ? formatDistanceToNow(new Date(currentPost.createdAt)) : "Unknown"} ago
            </Text>

            {currentUser?._id === user?._id && <DeleteIcon size={20} cursor={"pointer"} onClick={handleDeletePost} _hover={{ color: "red.500" }} />}
          </Flex>
        </Flex>

        {/* Post Content */}
        <Text my={3}>{currentPost.text}</Text>

        {/* Hiển thị hình ảnh */}
        {currentPost.img && (
          <>
            <Box borderRadius={12} overflow={"hidden"} mb={2} border={"1px solid"} borderColor={"gray.light"} position="relative">
              <Flex
                className="image-container"
                position="relative"
                overflowX="auto"
                scrollBehavior="smooth"
                css={{
                  "&::-webkit-scrollbar": {
                    display: "none",
                  },
                  scrollSnapType: "x mandatory",
                  cursor: "grab",
                  "&:active": {
                    cursor: "grabbing",
                  },
                }}
                onMouseDown={(e) => {
                  const ele = e.currentTarget;
                  const startX = e.pageX - ele.offsetLeft;
                  const scrollLeft = ele.scrollLeft;

                  const handleMouseMove = (e) => {
                    const x = e.pageX - ele.offsetLeft;
                    const walk = (x - startX) * 2;
                    ele.scrollLeft = scrollLeft - walk;
                  };

                  const handleMouseUp = () => {
                    document.removeEventListener("mousemove", handleMouseMove);
                    document.removeEventListener("mouseup", handleMouseUp);
                    ele.style.cursor = "grab";
                  };

                  document.addEventListener("mousemove", handleMouseMove);
                  document.addEventListener("mouseup", handleMouseUp);
                  ele.style.cursor = "grabbing";
                }}
                onScroll={(e) => {
                  const container = e.target;
                  const scrollPosition = container.scrollLeft;
                  const imageWidth = container.offsetWidth;
                  const newIndex = Math.round(scrollPosition / imageWidth);
                  setCurrentImageIndex(newIndex);
                }}
              >
                {Array.isArray(currentPost.img) ? (
                  currentPost.img.map((image, index) => (
                    <Box key={index} flexShrink={0} w="600px" h="400px" position="relative">
                      <Image
                        src={image}
                        alt={`Image ${index + 1}`}
                        width="100%"
                        h="400px"
                        objectFit="cover"
                        borderRadius="md"
                        onClick={() => {
                          setCurrentImageIndex(index);
                          onOpen();
                        }}
                        transition="transform 0.3s ease"
                      />
                      <Text position="absolute" right="8px" bottom="8px" bg="blackAlpha.700" color="white" px={2} py={1} borderRadius="full" fontSize="sm">
                        {index + 1}/{currentPost.img.length}
                      </Text>
                    </Box>
                  ))
                ) : (
                  <Image
                    src={currentPost.img}
                    width="100%"
                    h="400px"
                    objectFit="cover"
                    borderRadius="md"
                    onClick={() => {
                      setCurrentImageIndex(0);
                      onOpen();
                    }}
                    transition="transform 0.3s ease"
                  />
                )}
              </Flex>
            </Box>

            {/* Modal xem ảnh phóng to */}
            <Modal isOpen={isOpen} onClose={onClose} size="full">
              <ModalOverlay />
              <ModalContent bg="blackAlpha.900">
                <ModalCloseButton color="white" bg="whiteAlpha.300" borderRadius="full" size="lg" position="fixed" top={4} right={4} zIndex={9999} _hover={{ bg: "whiteAlpha.400" }} />

                <Flex justify="center" align="center" h="100vh" position="relative">
                  {Array.isArray(currentPost.img) && currentPost.img.length > 1 && (
                    <>
                      {/* Nút điều hướng trái */}
                      <IconButton
                        icon={<ChevronLeftIcon boxSize={10} />}
                        onClick={handlePrevImage}
                        position="fixed"
                        left={10}
                        top="50%"
                        transform="translateY(-50%)"
                        colorScheme="whiteAlpha"
                        variant="solid"
                        size="lg"
                        isRound
                        aria-label="Previous image"
                        zIndex={9999}
                      />

                      {/* Nút điều hướng phải */}
                      <IconButton
                        icon={<ChevronRightIcon boxSize={10} />}
                        onClick={handleNextImage}
                        position="fixed"
                        right={10}
                        top="50%"
                        transform="translateY(-50%)"
                        colorScheme="whiteAlpha"
                        variant="solid"
                        size="lg"
                        isRound
                        aria-label="Next image"
                        zIndex={9999}
                      />

                      {/* Chỉ số ảnh hiện tại */}
                      <Text position="fixed" bottom={4} color="white" fontSize="lg" fontWeight="bold">
                        {currentImageIndex + 1} / {currentPost.img.length}
                      </Text>
                    </>
                  )}

                  {/* Ảnh phóng to */}
                  <Image src={Array.isArray(currentPost.img) ? currentPost.img[currentImageIndex] : currentPost.img} maxH="90vh" maxW="90vw" objectFit="contain" />
                </Flex>
              </ModalContent>
            </Modal>
          </>
        )}

        {currentPost.video && (
          <Box borderRadius={6} overflow={"hidden"} border={"1px solid"} borderColor={"gray.light"}>
            <video width="100%" controls>
              <source src={currentPost.video} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Box>
        )}

        {currentPost.location?.name && (
          <Text fontSize="sm" color={colorMode === "dark" ? "white" : "black"} mt={2}>
            <strong>Location:</strong> {currentPost.location.name}
          </Text>
        )}

        {/* Actions */}
        <Flex gap={3} my={1}>
          <Actions post={currentPost} showReplies={true} onReplyAdded={updateReplies} />
        </Flex>

        <Divider my={4} />

        {/* Footer */}
        <Flex justifyContent={"space-between"}>
          <Flex gap={2} alignItems={"center"}>
            <Text fontSize={"2xl"}>👋</Text>
            <Text color={"gray.light"}>Get the app to like, reply and post.</Text>
          </Flex>
          <Button>Get</Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default PostPage;
