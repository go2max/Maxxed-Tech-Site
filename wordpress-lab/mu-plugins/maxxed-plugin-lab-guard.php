<?php
/**
 * Plugin Name: Maxxed Plugin Lab Guard
 * Description: Adds basic guardrails for a private WordPress plugin testing subsite.
 */

if (! defined('ABSPATH')) {
    exit;
}

add_action('send_headers', function () {
    header('X-Robots-Tag: noindex, nofollow, noarchive', true);
});

add_filter('pre_option_blog_public', function () {
    return '0';
});

add_filter('xmlrpc_enabled', '__return_false');

add_action('admin_notices', function () {
    if (! current_user_can('manage_options')) {
        return;
    }

    echo '<div class="notice notice-warning"><p><strong>Maxxed Plugin Lab:</strong> This WordPress install is for plugin ZIP testing only. Do not connect production customer data.</p></div>';
});

add_action('rest_api_init', function () {
    register_rest_route('maxxed-lab/v1', '/health', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function () {
            if (! function_exists('get_plugins')) {
                require_once ABSPATH . 'wp-admin/includes/plugin.php';
            }

            return rest_ensure_response(array(
                'ok' => true,
                'site_url' => get_site_url(),
                'environment' => wp_get_environment_type(),
                'active_theme' => wp_get_theme()->get('Name'),
                'plugin_count' => count(get_plugins()),
                'indexed' => (bool) get_option('blog_public'),
            ));
        },
    ));
});
