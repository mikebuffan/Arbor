import 'package:frontend/api/arbor_api_client.dart';
import 'package:frontend/api/chat_api.dart';
import 'package:frontend/config/arbor_config.dart';


final apiClient = ArborApiClient(
  baseUrl: ArborConfig.apiBaseUrl,
);
final chatApi = ChatApi(apiClient);