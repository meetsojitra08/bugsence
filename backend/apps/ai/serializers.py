from rest_framework import serializers


class AITriageRequestSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(required=True)
    raw_text = serializers.CharField(
        required=True,
        min_length=5,
        max_length=10000,
        trim_whitespace=True,
    )


class SuggestedAssigneeSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    reason = serializers.CharField()


class AITriageResponseSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=100)
    type = serializers.CharField()
    priority = serializers.CharField()
    severity = serializers.CharField()
    steps_to_reproduce = serializers.ListField(
        child=serializers.CharField(),
        default=list,
    )
    expected_behavior = serializers.CharField(allow_blank=True, default="")
    actual_behavior = serializers.CharField(allow_blank=True, default="")
    suggested_labels = serializers.ListField(
        child=serializers.CharField(),
        default=list,
    )
    possible_root_cause = serializers.CharField(allow_blank=True, default="")
    confidence = serializers.FloatField()
    reasoning = serializers.CharField(allow_blank=True, default="")
    missing_info = serializers.ListField(
        child=serializers.CharField(),
        default=list,
    )
    suggested_assignee = SuggestedAssigneeSerializer(allow_null=True, required=False, default=None)


class AIDuplicatesRequestSerializer(serializers.Serializer):
    project_id = serializers.UUIDField(required=True)
    title = serializers.CharField(required=True, min_length=2, max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    threshold = serializers.FloatField(required=False, min_value=0.0, max_value=1.0, default=0.80)


class AIDuplicateItemSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    number = serializers.IntegerField()
    key = serializers.CharField()
    title = serializers.CharField()
    status = serializers.CharField()
    similarity = serializers.FloatField()


class AISummarizeRequestSerializer(serializers.Serializer):
    regenerate = serializers.BooleanField(required=False, default=False)


class AISummaryResponseSerializer(serializers.Serializer):
    tldr = serializers.CharField()
    status = serializers.CharField()
    open_questions = serializers.ListField(child=serializers.CharField(), default=list)
    next_steps = serializers.ListField(child=serializers.CharField(), default=list)
    is_stale = serializers.BooleanField(default=False)
    generated_at = serializers.DateTimeField(allow_null=True)
