//Importaciones:
import React, { useEffect, useRef } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    StyleSheet,
    View,
} from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

//Responsive:
const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

const responsive = (mobile, tablet) => {
    return IS_TABLET ? tablet : mobile;
};

//Assets:
const logoLight = require("../../assets/logo-light.png");
const logoDark = require("../../assets/logo-dark.png");

//Config logo:
const LOGO_ZOOM = responsive(3.2, 3.35);
const CONTENT_OFFSET_Y = responsive(12, 18);

export default function SplashScreen({ theme }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.92)).current;
    const translateAnim = useRef(new Animated.Value(10)).current;

    const isDark = theme?.dark ?? true;

    const logoSource = isDark ? logoDark : logoLight;

    const splashBackground = theme?.colors?.background || "#0B111E";
    const splashCard = theme?.colors?.surface || "#151D2E";
    const splashPrimary = theme?.colors?.primary || "#2563EB";
    const splashSecondary = theme?.colors?.secondary || "#A7B0C2";
    const splashBorder =
        theme?.colors?.borderSoft || theme?.colors?.outline || "rgba(148, 163, 184, 0.18)";

    const footerColor = isDark
        ? "rgba(167, 176, 194, 0.72)"
        : "rgba(100, 116, 139, 0.82)";

    useEffect(() => {
        Animated.parallel([
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }),

        Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
        }),

        Animated.timing(translateAnim, {
            toValue: 0,
            duration: 650,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }),
        ]).start();
    }, [fadeAnim, scaleAnim, translateAnim]);

    return (
        <View style={[styles.container, { backgroundColor: splashBackground }]}>
        <Animated.View
            style={[
            styles.content,
            {
                opacity: fadeAnim,
                transform: [
                { scale: scaleAnim },
                { translateY: Animated.add(translateAnim, CONTENT_OFFSET_Y) },
                ],
            },
            ]}
        >
            <View style={styles.logoWrap}>
            <Image
                source={logoSource}
                style={[
                styles.logo,
                {
                    transform: [{ scale: LOGO_ZOOM }],
                },
                ]}
                resizeMode="contain"
            />
            </View>

            <Text style={[styles.subtitle, { color: splashSecondary }]}>
            Preparando tu espacio de trabajo
            </Text>

            <View
            style={[
                styles.loaderBox,
                {
                backgroundColor: splashCard,
                borderColor: splashBorder,
                },
            ]}
            >
            <ActivityIndicator size="small" color={splashPrimary} />

            <Text style={[styles.loaderText, { color: splashSecondary }]}>
                Cargando...
            </Text>
            </View>
        </Animated.View>

        <Text style={[styles.footer, { color: footerColor }]}>
            Panel personal para programadores
        </Text>
        </View>
    );
    }

    const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: responsive(28, 42),
    },

    content: {
        width: "100%",
        maxWidth: responsive(undefined, 620),
        alignItems: "center",
    },

    logoWrap: {
        width: responsive(210, 290),
        height: responsive(150, 205),
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible",
    },

    logo: {
        width: responsive(150, 190),
        height: responsive(105, 132),
    },

    subtitle: {
        marginTop: responsive(30, 42),
        fontSize: responsive(13.5, 17),
        lineHeight: responsive(20, 25),
        fontWeight: "700",
        textAlign: "center",
    },

    loaderBox: {
        marginTop: responsive(30, 42),
        minWidth: responsive(175, 220),
        height: responsive(48, 60),
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: responsive(18, 24),

        shadowColor: "#0F172A",
        shadowOffset: {
        width: 0,
        height: 8,
        },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 0,
    },

    loaderText: {
        marginLeft: responsive(10, 13),
        fontSize: responsive(12.5, 15),
        fontWeight: "800",
    },

    footer: {
        position: "absolute",
        bottom: responsive(75, 95),
        fontSize: responsive(12, 14),
        fontWeight: "700",
        textAlign: "center",
    },
});