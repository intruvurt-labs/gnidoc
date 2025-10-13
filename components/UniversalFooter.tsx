@@
-import React, { useState, useRef, useEffect } from 'react';
+import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
 import {
   View,
   Text,
   StyleSheet,
-  TouchableOpacity,
+  TouchableOpacity,
+  Pressable,
   Animated,
-  Dimensions,
   Image,
+  BackHandler,
+  AccessibilityInfo,
+  Platform,
 } from 'react-native';
+import * as Haptics from 'expo-haptics';
+import { useWindowDimensions } from 'react-native';
 import { useRouter, usePathname } from 'expo-router';
 import { useSafeAreaInsets } from 'react-native-safe-area-context';
@@
-import { useRouter, usePathname } from 'expo-router';
+// (icons unchanged)
 import Colors from '@/constants/colors';
 
-const { width } = Dimensions.get('window');
+const MENU_COLUMNS = 3;
+const MENU_PADDING = 20;
+const MENU_GAP = 12; // visual gap we’ll simulate with margins for cross-RN reliability
@@
 export default function UniversalFooter() {
   const [isExpanded, setIsExpanded] = useState(false);
+  const [reduceMotion, setReduceMotion] = useState(false);
   const router = useRouter();
   const pathname = usePathname();
   const insets = useSafeAreaInsets();
-  
+  const { width } = useWindowDimensions();
+
   const scaleAnim = useRef(new Animated.Value(1)).current;
   const rotateAnim = useRef(new Animated.Value(0)).current;
   const expandAnim = useRef(new Animated.Value(0)).current;
 
   useEffect(() => {
-    if (isExpanded) {
-      Animated.parallel([
-        Animated.spring(expandAnim, {
-          toValue: 1,
-          useNativeDriver: true,
-          tension: 50,
-          friction: 7,
-        }),
-        Animated.timing(rotateAnim, {
-          toValue: 1,
-          duration: 300,
-          useNativeDriver: true,
-        }),
-      ]).start();
-    } else {
-      Animated.parallel([
-        Animated.spring(expandAnim, {
-          toValue: 0,
-          useNativeDriver: true,
-          tension: 50,
-          friction: 7,
-        }),
-        Animated.timing(rotateAnim, {
-          toValue: 0,
-          duration: 300,
-          useNativeDriver: true,
-        }),
-      ]).start();
-    }
+    // Respect reduced motion
+    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
+  }, []);
+
+  useEffect(() => {
+    // Stop any in-flight animations before starting a new set
+    expandAnim.stopAnimation();
+    rotateAnim.stopAnimation();
+
+    const duration = reduceMotion ? 1 : 300;
+    const springCfg = reduceMotion
+      ? { toValue: isExpanded ? 1 : 0, useNativeDriver: true, speed: 1, bounciness: 0 }
+      : { toValue: isExpanded ? 1 : 0, useNativeDriver: true, tension: 50, friction: 7 };
+
+    Animated.parallel([
+      Animated.spring(expandAnim, springCfg as any),
+      Animated.timing(rotateAnim, { toValue: isExpanded ? 1 : 0, duration, useNativeDriver: true }),
+    ]).start();
   }, [isExpanded, expandAnim, rotateAnim
+    , reduceMotion
   ]);
 
-  const handleNavigate = (route: string) => {
-    setIsExpanded(false);
-    router.push(route as any);
-  };
+  useEffect(() => {
+    if (!isExpanded) return;
+    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
+      setIsExpanded(false);
+      return true;
+    });
+    return () => sub.remove();
+  }, [isExpanded]);
+
+  const handleNavigate = useCallback((route: string) => {
+    setIsExpanded(false);
+    if (pathname === '/' && route === '/(tabs)') return; // already home
+    if (pathname.startsWith(route.replace('/(tabs)', ''))) return; // already on route
+    router.push(route as any);
+  }, [pathname, router]);
 
   const toggleExpand = () => {
+    if (!reduceMotion) {
+      scaleAnim.stopAnimation();
+      Animated.sequence([
+        Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
+        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
+      ]).start();
+    }
+    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
     setIsExpanded(!isExpanded);
   };
@@
-  const isActive = (route: string) => {
-    if (route === '/(tabs)') {
-      return pathname === '/' || pathname === '/(tabs)';
-    }
-    return pathname.includes(route.replace('/(tabs)/', ''));
-  };
+  const isActive = useCallback((route: string) => {
+    if (route === '/(tabs)') return pathname === '/' || pathname === '/(tabs)';
+    const norm = route.replace('/(tabs)', '');
+    return pathname === norm || pathname.startsWith(norm + '/');
+  }, [pathname]);
+
+  // Compute item width w/ gutters that mimic `gap`
+  const containerW = Math.min(width * 0.9, 500);
+  const rowGutters = (MENU_COLUMNS - 1) * MENU_GAP;
+  const itemW = (containerW - rowGutters - (MENU_PADDING * 2)) / MENU_COLUMNS;
@@
-      {isExpanded && (
-        <TouchableOpacity
+      {isExpanded && (
+        <Pressable
           style={styles.overlay}
-          activeOpacity={1}
           onPress={() => setIsExpanded(false)}
+          accessibilityRole="button"
+          accessibilityLabel="Close menu overlay"
+          accessibilityHint="Closes the expanded quick menu"
         >
           <Animated.View
             style={[
               styles.menuContainer,
               {
                 opacity: menuOpacity,
                 transform: [{ scale: menuScale }],
+                width: containerW,
               },
             ]}
           >
-            <View style={styles.menuGrid}>
+            <View style={styles.menuGrid} accessibilityRole="menu">
               {NAV_ITEMS.map((item, index) => {
                 const Icon = item.icon;
-                const active = isActive(item.route);
+                const active = isActive(item.route);
                 
                 return (
                   <TouchableOpacity
                     key={item.name}
                     style={[
                       styles.menuItem,
                       active && styles.menuItemActive,
+                      { width: itemW, marginRight: ((index + 1) % MENU_COLUMNS === 0) ? 0 : MENU_GAP, marginBottom: MENU_GAP },
                     ]}
                     onPress={() => handleNavigate(item.route)}
+                    accessibilityRole="menuitem"
+                    accessibilityState={{ selected: !!active }}
+                    accessibilityLabel={item.label}
+                    accessibilityHint={`Navigate to ${item.label}`}
+                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
+                    android_ripple={Platform.select({ android: { borderless: false } })}
                   >
                     <View style={[styles.menuIconContainer, active && styles.menuIconContainerActive]}>
                       <Icon
                         color={active ? Colors.Colors.text.inverse : Colors.Colors.cyan.primary}
                         size={24}
                       />
                     </View>
                     <Text style={[styles.menuItemText, active && styles.menuItemTextActive]}>
                       {item.label}
                     </Text>
                   </TouchableOpacity>
                 );
               })}
             </View>
           </Animated.View>
-        </TouchableOpacity>
+        </Pressable>
       )}
@@
         <TouchableOpacity
           style={styles.sphereButton}
           onPress={toggleExpand}
           activeOpacity={0.8}
+          accessibilityRole="button"
+          accessibilityLabel={isExpanded ? 'Close menu' : 'Open menu'}
+          accessibilityHint="Opens quick navigation grid"
+          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
         >
           <Animated.View
             style={[
               styles.sphereContainer,
               {
                 transform: [{ scale: scaleAnim }, { rotate: rotation }],
               },
             ]}
           >
             <Image
               source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/43sdu1wozhhc59ove8qj5' }}
               style={styles.sphereImage}
               resizeMode="contain"
+              accessible
+              accessibilityIgnoresInvertColors
+              accessibilityLabel="Lucent blue sphere logo"
             />
             <View style={styles.sphereBadge}>
               <Text style={styles.sphereBadgeText}>MENU</Text>
             </View>
           </Animated.View>
         </TouchableOpacity>
@@
   menuContainer: {
-    width: width * 0.9,
-    maxWidth: 500,
     backgroundColor: Colors.Colors.background.card,
     borderRadius: 24,
-    padding: 20,
+    padding: MENU_PADDING,
     borderWidth: 3,
     borderColor: Colors.Colors.cyan.primary,
     shadowColor: Colors.Colors.cyan.primary,
     shadowOffset: { width: 0, height: 0 },
     shadowOpacity: 0.8,
     shadowRadius: 30,
     elevation: 20,
   },
   menuGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
-    gap: 12,
     justifyContent: 'center',
   },
   menuItem: {
-    width: (width * 0.9 - 80) / 3,
-    maxWidth: 110,
     aspectRatio: 1,
     backgroundColor: Colors.Colors.background.secondary,
     borderRadius: 16,
     padding: 12,
     alignItems: 'center',
     justifyContent: 'center',
     borderWidth: 2,
     borderColor: Colors.Colors.border.muted,
   },
